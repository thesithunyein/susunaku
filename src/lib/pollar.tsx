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
 * `trustlineEstablished` is the field that decides whether a contribution can
 * land at all: a Stellar wallet cannot receive an asset it holds no trustline
 * for, and a first-time member has never heard the word.
 */
function readUsdcAsset(client: PollarClient): UsdcAssetInfo | null {
  let raw: unknown;
  try {
    raw = client.getEnabledAssetsState();
  } catch {
    return null;
  }
  const state = raw as { step?: string; data?: { exists?: boolean; assets?: unknown } };
  if (state?.step !== "loaded" || !state.data) return null;
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
      enabledInApp: record.enabledInApp === undefined ? null : Boolean(record.enabledInApp),
      trustlineEstablished: Boolean(record.trustlineEstablished),
      sponsored: record.sponsored === undefined ? null : Boolean(record.sponsored),
      walletExists: Boolean(state.data.exists),
    };
  }
  return null;
}

export function PollarGateway({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => resolveApiKey());
  const [status, setStatus] = useState<PollarStatus>(apiKey ? "initialising" : "no-key");
  const [auth, setAuth] = useState<AuthState>({ step: "idle" });
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
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
          const info = readUsdcAsset(client);
          setUsdcTrustline(info ? info.trustlineEstablished : null);
          setUsdcEnabledInApp(info ? info.enabledInApp : null);
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

    let info = readUsdcAsset(client);
    if (!info) {
      try {
        await client.refreshAssets();
      } catch {
        /* the read below is the authority either way */
      }
      info = readUsdcAsset(client);
    }
    if (!info) {
      return {
        ok: false,
        message:
          "USDC is not enabled for this app yet. Add it in the Pollar dashboard under " +
          "Build → Tokens / Trustlines, then retry.",
      };
    }
    if (info.trustlineEstablished) {
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
    const established = Boolean(readUsdcAsset(client)?.trustlineEstablished);
    setUsdcTrustline(established);
    if (established || outcome.status === "success" || outcome.status === "pending") {
      return { ok: true };
    }
    return {
      ok: false,
      message: outcome.details ?? "Could not establish the USDC trustline.",
    };
  }, [client]);

  const pay = useCallback(
    async (args: PayArgs): Promise<SubmitOutcome> => {
      if (!client) {
        return { status: "error", message: "No Pollar key configured." };
      }
      if (!addressRef.current) {
        return { status: "error", message: "Sign in before paying a contribution." };
      }
      // Read the trustline fresh rather than from state: the member may have
      // signed in a moment ago and the asset list may not have landed yet.
      if (!readUsdcAsset(client)?.trustlineEstablished) {
        const ensured = await ensureUsdcTrustline();
        if (!ensured.ok) {
          return {
            status: "error",
            message: ensured.message ?? "Could not prepare the USDC trustline.",
          };
        }
      }
      const outcome = await client.runTx("payment", {
        destination: args.destination,
        amount: args.amount.toFixed(2),
        asset: {
          type: "credit_alphanum4",
          code: "USDC",
          issuer: USDC_ISSUER_ACTIVE,
        },
      });
      if (outcome.status === "success" || outcome.status === "pending") {
        setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE));
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
    pay,
  };

  return <PollarContext.Provider value={value}>{children}</PollarContext.Provider>;
}

export function usePollar(): PollarContextValue {
  const ctx = useContext(PollarContext);
  if (!ctx) throw new Error("usePollar must be used inside <PollarGateway>");
  return ctx;
}
