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
 * login, and pays the network fees, which is what makes a savings circle usable
 * by someone who has never touched crypto. We only consume it: auth, the
 * wallet address, the balance, and payment submission.
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

export function PollarGateway({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => resolveApiKey());
  const [status, setStatus] = useState<PollarStatus>(apiKey ? "initialising" : "no-key");
  const [auth, setAuth] = useState<AuthState>({ step: "idle" });
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState<string | null>(null);
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
        .then(() => setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE)))
        .catch(() => setBalanceUsdc(null));
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
          .then(() => setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE)))
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
      .then(() => setBalanceUsdc(readBalance(client, USDC_ISSUER_ACTIVE)))
      .catch(() => setBalanceUsdc(null));
  }, [client]);

  const pay = useCallback(
    async (args: PayArgs): Promise<SubmitOutcome> => {
      if (!client) {
        return { status: "error", message: "No Pollar key configured." };
      }
      if (!addressRef.current) {
        return { status: "error", message: "Sign in before paying a contribution." };
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
    [client]
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
    pay,
  };

  return <PollarContext.Provider value={value}>{children}</PollarContext.Provider>;
}

export function usePollar(): PollarContextValue {
  const ctx = useContext(PollarContext);
  if (!ctx) throw new Error("usePollar must be used inside <PollarGateway>");
  return ctx;
}
