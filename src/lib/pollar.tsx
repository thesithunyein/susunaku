import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PollarClient, type AuthState, type SubmitOutcome } from "@pollar/core";
import {
  NETWORK,
  USDC_ISSUER_ACTIVE,
  apiKeyIsSecret,
  apiKeyLooksValid,
  keyNetwork,
  resolveApiKey,
  storeApiKey,
  type StellarNetwork,
} from "./config";

/**
 * Thin, typed wrapper over @pollar/core.
 *
 * Pollar gives every user a non-custodial wallet behind a social or email
 * login, and sponsors the wallet and its trustlines, which is what makes a
 * savings circle usable by someone who has never touched crypto. We only
 * consume it: auth, the wallet address, the balances, and payment submission.
 *
 * One thing Pollar does NOT cover: the fee of a Stellar payment. That comes out
 * of the sending account's own XLM, and the SDK refuses to build the
 * transaction without it — hence `readNativeBalance`, so the UI can say so
 * before the click instead of after.
 */

export type PollarStatus =
  | "no-key"
  | "initialising"
  | "signed-out"
  | "authenticating"
  | "ready"
  | "error";

export interface PayArgs {
  destination: string;
  /** USDC amount, human units. */
  amount: number;
}

/** A corridor Pollar can actually execute for this app: country + its fiat. */
export interface RampCorridor {
  code: string;
  currency: string | null;
}

/** One provider's offer for a corridor, narrowed from the SDK's generated shape. */
export interface RampQuoteView {
  quoteId: string;
  provider: string;
  rail: string;
  protocol: string;
  fee: number | null;
  feeCurrency: string | null;
  rate: number | null;
  estimatedTime: string | null;
  recommended: boolean;
  minAmount: number | null;
  maxAmount: number | null;
}

interface PollarContextValue {
  hasKey: boolean;
  keyNet: StellarNetwork | null;
  status: PollarStatus;
  authStep: AuthState["step"] | "none";
  authMessage: string | null;
  address: string | null;
  email: string | null;
  balanceUsdc: string | null;
  /**
   * Native XLM, in human units. null while unknown. A Stellar payment's fee is
   * paid from this, so a zero here means a contribution cannot be submitted.
   */
  xlmBalance: string | null;
  /** null while unknown (signed out, or the asset list hasn't loaded yet). */
  usdcTrustline: boolean | null;
  /** Whether this app has USDC enabled at all. null while unknown. */
  usdcEnabledInApp: boolean | null;
  txPending: boolean;
  saveKey: (key: string) => { ok: boolean; error?: string };
  clearKey: () => void;
  loginGoogle: () => void;
  beginEmail: () => void;
  sendEmailCode: (email: string) => void;
  verifyEmailCode: (code: string) => void;
  cancelLogin: () => void;
  signOut: () => void;
  refreshBalance: () => void;
  ensureUsdcTrustline: () => Promise<{ ok: boolean; message?: string }>;
  /**
   * Countries + fiats this app can actually ramp in. Read from the SDK rather
   * than hardcoded, so the UI can never claim a corridor the backend cannot
   * execute — an empty list is a real answer, not a bug.
   */
  rampCorridors: RampCorridor[] | null;
  rampCorridorsStatus: "idle" | "loading" | "loaded" | "error";
  rampCorridorsMessage: string | null;
  loadRampCorridors: () => void;
  quoteRamp: (args: {
    country: string;
    currency: string;
    amount: number;
    direction: "onramp" | "offramp";
  }) => Promise<RampQuoteView[]>;
  pay: (args: PayArgs) => Promise<SubmitOutcome>;
}

const PollarContext = createContext<PollarContextValue | null>(null);

/** The SDK's balance record shape has moved between minor versions; narrow at runtime. */
function pickUsdc(balances: unknown, issuer: string): string | null {
  if (!Array.isArray(balances)) return null;
  const wanted = issuer.trim().toUpperCase();
  for (const entry of balances) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const code = String(record.assetCode ?? record.code ?? record.asset_code ?? "");
    const recordIssuer = String(
      record.assetIssuer ?? record.issuer ?? record.asset_issuer ?? ""
    ).toUpperCase();
    if (code.toUpperCase() !== "USDC") continue;
    if (recordIssuer && recordIssuer !== wanted) continue;
    const amount = record.balance ?? record.available ?? record.amount;
    if (amount === null || amount === undefined) continue;
    return String(amount);
  }
  return null;
}

function readBalance(client: PollarClient, issuer: string): string | null {
  const state = client.getWalletBalanceState() as unknown as {
    step?: string;
    data?: { balances?: unknown };
  };
  return pickUsdc(state?.data?.balances, issuer);
}

/**
 * Native balance, in human units.
 *
 * Stellar takes a payment's fee from the sending account's own XLM. Pollar
 * sponsors the wallet, its reserves and its trustlines, so a fresh member has a
 * working USDC wallet holding exactly zero XLM — and the SDK then refuses the
 * payment client-side with "Not enough XLM to cover the network fee", before
 * anything reaches the ledger. Reading this lets the UI explain that instead.
 */
function readNativeBalance(client: PollarClient): string | null {
  const state = client.getWalletBalanceState() as unknown as {
    step?: string;
    data?: { balances?: unknown };
  };
  const balances = state?.data?.balances;
  if (!Array.isArray(balances)) return null;
  for (const entry of balances) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const code = String(record.assetCode ?? record.code ?? record.asset_code ?? "").toUpperCase();
    const kind = String(
      record.assetType ?? record.asset_type ?? record.type ?? ""
    ).toLowerCase();
    if (kind !== "native" && code !== "XLM") continue;
    const amount = record.balance ?? record.available ?? record.amount;
    if (amount === null || amount === undefined) continue;
    return String(amount);
  }
  return null;
}

interface UsdcAssetInfo {
  enabledInApp: boolean | null;
  trustlineEstablished: boolean;
  sponsored: boolean | null;
  walletExists: boolean;
}

/**
 * Reads the app's enabled-asset records for USDC.
 *
 * Three outcomes, because two of them are not the same thing and conflating
 * them produced a lie: when `/wallet/assets` is still in flight or has failed,
 * the SDK's state is `loading` or `error` — NOT "this app has no USDC". Telling
 * a member to go configure the dashboard over a transient fetch would send them
 * chasing a problem that does not exist.
 */
type UsdcAssetRead =
  /** The asset list could not be read; we know nothing either way. */
  | { kind: "unknown"; reason: string }
  /** Read successfully, and the app configures no USDC record. */
  | { kind: "absent" }
  | { kind: "present"; info: UsdcAssetInfo };

function readUsdcAsset(client: PollarClient): UsdcAssetRead {
  let raw: unknown;
  try {
    raw = client.getEnabledAssetsState();
  } catch {
    return { kind: "unknown", reason: "the SDK could not read its asset state" };
  }
  const state = raw as {
    step?: string;
    message?: string;
    data?: { exists?: boolean; assets?: unknown };
  };
  if (state?.step === "error") {
    return {
      kind: "unknown",
      reason: state.message ?? "Pollar did not return your asset list",
    };
  }
  if (state?.step !== "loaded" || !state.data) {
    return { kind: "unknown", reason: `the asset list is still ${state?.step ?? "unavailable"}` };
  }
  const list = Array.isArray(state.data.assets) ? state.data.assets : [];
  const wanted = USDC_ISSUER_ACTIVE.toUpperCase();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const code = String(record.code ?? record.assetCode ?? "").toUpperCase();
    const issuer = String(record.issuer ?? record.assetIssuer ?? "").toUpperCase();
    if (code !== "USDC") continue;
    if (issuer && issuer !== wanted) continue;
    return {
      kind: "present",
      info: {
        enabledInApp: record.enabledInApp === undefined ? null : Boolean(record.enabledInApp),
        trustlineEstablished: Boolean(record.trustlineEstablished),
        sponsored: record.sponsored === undefined ? null : Boolean(record.sponsored),
        walletExists: Boolean(state.data.exists),
      },
    };
  }
  return { kind: "absent" };
}

/**
 * Whether a failed submission failed *because the asset is not trusted*.
 *
 * Only that specific failure justifies running the (extra, network-round-trip)
 * trustline step — so we match on the error text rather than optimistically
 * "preparing" a trustline that the ledger already shows as authorized.
 */
function failedOnTrustline(outcome: SubmitOutcome): boolean {
  if (outcome.status !== "error") return false;
  return [outcome.message, outcome.details, outcome.resultCode, outcome.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes("trust");
}

export function PollarGateway({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => resolveApiKey());
  const [status, setStatus] = useState<PollarStatus>(apiKey ? "initialising" : "no-key");
  const [auth, setAuth] = useState<AuthState>({ step: "idle" });
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [rampCorridors, setRampCorridors] = useState<RampCorridor[] | null>(null);
  const [rampCorridorsStatus, setRampCorridorsStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [rampCorridorsMessage, setRampCorridorsMessage] = useState<string | null>(null);
  const [usdcTrustline, setUsdcTrustline] = useState<boolean | null>(null);
  const [usdcEnabledInApp, setUsdcEnabledInApp] = useState<boolean | null>(null);
  const [txPending, setTxPending] = useState(false);
  const addressRef = useRef<string | null>(null);

  const client = useMemo(() => {
    if (!apiKey) return null;
    try {
      return new PollarClient({ apiKey, stellarNetwork: NETWORK });
    } catch {
      return null;
    }
  }, [apiKey]);

  // Attach to the client: restore the session, then mirror every state change.
  useEffect(() => {
    if (!client) {
      setStatus(apiKey ? "error" : "no-key");
      return;
    }
    let cancelled = false;
    setStatus("initialising");

    const syncWallets = () => {
      try {
        const wallets = client.getWallets();
        const stellar = wallets.find((w) => w.chain === "STELLAR") ?? wallets[0];
        const next = stellar?.address ?? null;
        addressRef.current = next;
        setAddress(next);
      } catch {
        addressRef.current = null;
        setAddress(null);
      }
      try {
        const profile = client.getUserProfile();
        setEmail(profile?.mail ?? null);
      } catch {
        setEmail(null);
      }
      void client
        .refreshBalance()
        .then(() => {
          setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE));
          setXlmBalance(readNativeBalance(client));
        })
        .catch(() => {
          setBalanceUsdc(null);
          setXlmBalance(null);
        });
      void client
        .refreshAssets()
        .catch(() => undefined)
        .then(() => {
          const read = readUsdcAsset(client);
          setUsdcTrustline(read.kind === "present" ? read.info.trustlineEstablished : null);
          setUsdcEnabledInApp(read.kind === "present" ? read.info.enabledInApp : null);
        });
    };

    const offAuth = client.onAuthStateChange((state) => {
      if (cancelled) return;
      setAuth(state);
      if (state.step === "authenticated") {
        setStatus("ready");
        syncWallets();
        return;
      }
      if (state.step === "error") {
        setStatus("error");
        return;
      }
      if (state.step === "idle") {
        setStatus("signed-out");
        addressRef.current = null;
        setAddress(null);
        setEmail(null);
        setBalanceUsdc(null);
        setXlmBalance(null);
        setRampCorridors(null);
        setRampCorridorsStatus("idle");
        setRampCorridorsMessage(null);
        setUsdcTrustline(null);
        setUsdcEnabledInApp(null);
        return;
      }
      setStatus("authenticating");
    });

    const offTx = client.onTransactionStateChange((state) => {
      if (cancelled) return;
      setTxPending(state.step !== "idle" && state.step !== "success" && state.step !== "error");
      if (state.step === "success" && addressRef.current) {
        void client
          .refreshBalance()
          .then(() => {
            setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE));
            setXlmBalance(readNativeBalance(client));
          })
          .catch(() => undefined);
      }
    });

    client
      .ready()
      .then(() => {
        if (cancelled) return;
        const current = client.getAuthState();
        setAuth(current);
        if (current.step === "authenticated") {
          setStatus("ready");
          syncWallets();
        } else {
          setStatus("signed-out");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setAuth({
          step: "error",
          previousStep: "initialising",
          message: err instanceof Error ? err.message : "Could not start Pollar",
          errorCode: "UNEXPECTED_ERROR",
        });
      });

    return () => {
      cancelled = true;
      offAuth();
      offTx();
      try {
        client.destroy();
      } catch {
        /* already torn down */
      }
    };
  }, [client, apiKey]);

  const saveKey = useCallback((raw: string) => {
    const key = raw.trim();
    if (/^pat_/.test(key)) {
      return {
        ok: false,
        error:
          "That is a Pollar personal access token, not a publishable key — the client API refuses it " +
          "(API_KEY_TYPE_NOT_ALLOWED). Use the pub_testnet_… key from dashboard.pollar.xyz → Build → API Keys.",
      };
    }
    if (!apiKeyLooksValid(key)) {
      return {
        ok: false,
        error: "That does not look like a Pollar key. Expected pub_testnet_… or pub_mainnet_…",
      };
    }
    if (apiKeyIsSecret(key)) {
      return {
        ok: false,
        error: "That is a secret key. Secret keys stay on a backend — use the publishable one.",
      };
    }
    const net = keyNetwork(key);
    if (net && net !== NETWORK) {
      return {
        ok: false,
        error: `That key is for ${net}, but this build runs on ${NETWORK}. Set VITE_STELLAR_NETWORK=${net} and rebuild.`,
      };
    }
    storeApiKey(key);
    setApiKey(key);
    setStatus("initialising");
    return { ok: true };
  }, []);

  const clearKey = useCallback(() => {
    try {
      window.localStorage.removeItem("susunaku.pollar.publishable_key");
    } catch {
      /* nothing to clear */
    }
    setApiKey(null);
    setStatus("no-key");
  }, []);

  const loginGoogle = useCallback(() => client?.login({ provider: "google" }), [client]);
  const beginEmail = useCallback(() => client?.beginEmailLogin(), [client]);
  const sendEmailCode = useCallback(
    (mail: string) => client?.sendEmailCode(mail),
    [client]
  );
  const verifyEmailCode = useCallback(
    (code: string) => client?.verifyEmailCode(code),
    [client]
  );
  const cancelLogin = useCallback(() => client?.cancelLogin(), [client]);

  const signOut = useCallback(() => {
    void client?.logout();
  }, [client]);

  const refreshBalance = useCallback(() => {
    if (!client) return;
    void client
      .refreshBalance()
      .then(() => {
        setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE));
        setXlmBalance(readNativeBalance(client));
      })
      .catch(() => {
        setBalanceUsdc(null);
        setXlmBalance(null);
      });
  }, [client]);

  /**
   * Establishes the wallet's USDC trustline if it doesn't have one.
   *
   * Pollar creates the wallet at login and the trustline is a separate step, so
   * a brand-new member cannot receive USDC until this runs. When the asset is
   * app-configured the app's funding wallet sponsors the reserve and the fee,
   * which is why this works for someone holding zero XLM.
   */
  const ensureUsdcTrustline = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!client) return { ok: false, message: "No Pollar key configured." };
    if (!addressRef.current) {
      return { ok: false, message: "Sign in before paying a contribution." };
    }

    let read = readUsdcAsset(client);
    if (read.kind === "unknown") {
      // The state may simply not have landed yet — ask once before concluding.
      try {
        await client.refreshAssets();
      } catch {
        /* the re-read below is the authority either way */
      }
      read = readUsdcAsset(client);
    }
    if (read.kind === "unknown") {
      return {
        ok: false,
        message: `Could not read your asset list from Pollar (${read.reason}). Try again in a moment.`,
      };
    }
    if (read.kind === "absent") {
      return {
        ok: false,
        message:
          "This app configures no USDC asset, so no wallet can hold it. Add USDC in the " +
          "Pollar dashboard under Build → Tokens / Trustlines, then retry.",
      };
    }
    if (read.info.trustlineEstablished) {
      setUsdcTrustline(true);
      return { ok: true };
    }

    // Pollar may have created the trustline during login, in which case the read
    // above was simply early. Re-read from the chain-of-truth before asking the
    // server to create something that already exists — a redundant request can
    // throw, and an exception here would block a perfectly good payment.
    let outcome: { status: string; details?: string } | null = null;
    try {
      outcome = await client.setTrustline({
        code: "USDC",
        issuer: USDC_ISSUER_ACTIVE,
      });
    } catch (err) {
      outcome = {
        status: "error",
        details: err instanceof Error ? err.message : "Could not reach Pollar.",
      };
    }
    try {
      await client.refreshAssets();
    } catch {
      /* fall through — the read below is what we report on */
    }
    const after = readUsdcAsset(client);
    const established = after.kind === "present" && after.info.trustlineEstablished;
    setUsdcTrustline(established);
    if (established || outcome.status === "success" || outcome.status === "pending") {
      return { ok: true };
    }
    return {
      ok: false,
      message: outcome.details ?? "Could not establish the USDC trustline.",
    };
  }, [client]);

  /**
   * Reads the ramp corridors the backend can genuinely execute.
   *
   * A minimal or empty list is a truthful answer: an app that has enabled no
   * ramp provider has no corridor, and saying so is more useful than showing a
   * route that would fail at the provider.
   */
  const loadRampCorridors = useCallback(async () => {
    if (!client) return;
    setRampCorridorsStatus("loading");
    setRampCorridorsMessage(null);
    // Live discovery asks the backend which corridors it can execute. That
    // endpoint refuses publishable keys (API_KEY_TYPE_NOT_ALLOWED) — it is an
    // operator-dashboard capability — and in the browser the request can also
    // stall rather than settle. Either way, the honest fallback is the same:
    // show Pollar's documented ramp list, labelled as such, and never leave a
    // member on a spinner.
    const documentedFallback = (): RampCorridor[] => [
      { code: "BO", currency: "BOB" },
      { code: "BR", currency: "BRL" },
      { code: "CO", currency: "COP" },
      { code: "MX", currency: "MXN" },
    ];
    try {
      const content = (await Promise.race([
        client.getRampCountries() as Promise<{
          countries?: { code?: string; currency?: string | null }[];
        }>,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ])) as { countries?: { code?: string; currency?: string | null }[] } | null;
      const list = Array.isArray(content?.countries) ? content!.countries! : null;
      if (list) {
        setRampCorridors(
          list.map((entry) => ({
            code: String(entry.code ?? ""),
            currency: entry.currency ?? null,
          }))
        );
        setRampCorridorsStatus("loaded");
        return;
      }
      // Timed out or empty: documented list, plainly labelled.
      setRampCorridors(documentedFallback());
      setRampCorridorsStatus("loaded");
      setRampCorridorsMessage(
        "Live corridor discovery needs an operator key, so this is Pollar's documented ramp list rather than a live read."
      );
    } catch (err) {
      setRampCorridors(documentedFallback());
      setRampCorridorsStatus("loaded");
      setRampCorridorsMessage(
        `Live corridor discovery is not available to a publishable key (${err instanceof Error ? err.message : "request failed"}), so this is Pollar's documented ramp list.`
      );
    }
  }, [client]);

  /** Live quote from the providers backing a corridor. Read-only: no order is created. */
  const quoteRamp = useCallback(
    async (args: {
      country: string;
      currency: string;
      amount: number;
      direction: "onramp" | "offramp";
    }): Promise<RampQuoteView[]> => {
      if (!client) throw new Error("No Pollar key configured.");
      const content = (await client.getRampsQuote({
        country: args.country,
        currency: args.currency,
        amount: args.amount,
        direction: args.direction,
      })) as { quotes?: Record<string, unknown>[] };
      const quotes = Array.isArray(content?.quotes) ? content.quotes : [];
      const num = (value: unknown): number | null =>
        typeof value === "number" && Number.isFinite(value) ? value : null;
      const str = (value: unknown): string | null =>
        typeof value === "string" && value ? value : null;
      return quotes.map((quote) => ({
        quoteId: String(quote.quoteId ?? ""),
        provider: String(quote.provider ?? ""),
        rail: String(quote.rail ?? ""),
        protocol: String(quote.protocol ?? ""),
        fee: num(quote.fee),
        feeCurrency: str(quote.feeCurrency),
        rate: num(quote.rate),
        estimatedTime: str(quote.estimatedTime),
        recommended: Boolean(quote.recommended),
        minAmount: num(quote.minAmount),
        maxAmount: num(quote.maxAmount),
      }));
    },
    [client]
  );

  const pay = useCallback(
    async (args: PayArgs): Promise<SubmitOutcome> => {
      if (!client) {
        return { status: "error", message: "No Pollar key configured." };
      }
      if (!addressRef.current) {
        return { status: "error", message: "Sign in before paying a contribution." };
      }
      const submitPayment = () =>
        client.runTx("payment", {
          destination: args.destination,
          amount: args.amount.toFixed(2),
          asset: {
            type: "credit_alphanum4",
            code: "USDC",
            issuer: USDC_ISSUER_ACTIVE,
          },
        });

      // Submit first, and never gate on the SDK's cached asset state.
      //
      // Pollar creates the wallet's trustline during login, so normally there is
      // nothing to prepare. Gating on the cache previously blocked a perfectly
      // good payment — and reported "USDC is not enabled for this app" — whenever
      // the asset fetch was still loading or had failed. Only a submission that
      // actually fails on a missing trustline earns the repair round-trip.
      let outcome = await submitPayment();
      if (failedOnTrustline(outcome)) {
        const ensured = await ensureUsdcTrustline();
        if (!ensured.ok) {
          return {
            status: "error",
            message: ensured.message ?? "Could not prepare the USDC trustline.",
          };
        }
        outcome = await submitPayment();
      }
      if (outcome.status === "success" || outcome.status === "pending") {
        setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE));
        setXlmBalance(readNativeBalance(client));
      }
      return outcome;
    },
    [client, ensureUsdcTrustline]
  );

  const value: PollarContextValue = {
    hasKey: Boolean(apiKey),
    keyNet: apiKey ? keyNetwork(apiKey) : null,
    status,
    authStep: auth.step,
    authMessage: auth.step === "error" ? auth.message : null,
    address,
    email,
    balanceUsdc,
    xlmBalance,
    usdcTrustline,
    usdcEnabledInApp,
    txPending,
    saveKey,
    clearKey,
    loginGoogle,
    beginEmail,
    sendEmailCode,
    verifyEmailCode,
    cancelLogin,
    signOut,
    refreshBalance,
    ensureUsdcTrustline,
    rampCorridors,
    rampCorridorsStatus,
    rampCorridorsMessage,
    loadRampCorridors: () => void loadRampCorridors(),
    quoteRamp,
    pay,
  };

  return <PollarContext.Provider value={value}>{children}</PollarContext.Provider>;
}

export function usePollar(): PollarContextValue {
  const ctx = useContext(PollarContext);
  if (!ctx) throw new Error("usePollar must be used inside <PollarGateway>");
  return ctx;
}
