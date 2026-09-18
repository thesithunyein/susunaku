import { useEffect, useRef, useState } from "react";
import { usePollar } from "../lib/pollar";
import { shortAddr } from "../lib/format";
import { NETWORK, USDC_ISSUER_ACTIVE } from "../lib/config";
import { fmtUsdcDisplay } from "../lib/format";

const STEP_COPY: Record<string, string> = {
  creating_session: "Opening a session…",
  entering_email: "Enter your email to get a code.",
  sending_email: "Sending your code…",
  entering_code: "Enter the six digits we emailed you.",
  verifying_email_code: "Checking your code…",
  opening_oauth: "Opening Google…",
  connecting_wallet: "Connecting wallet…",
  authenticating: "Signing you in…",
  creating_passkey: "Creating a passkey…",
  deploying_smart_account: "Deploying your account…",
};

export function KeyForm() {
  const { saveKey, hasKey, clearKey, keyNet } = usePollar();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (hasKey) {
    return (
      <div className="stack">
        <div className="note note-good">
          Pollar key connected{keyNet ? ` (${keyNet})` : ""}. Payments run on{" "}
          <strong>{NETWORK}</strong> with USDC <code>{shortAddr(USDC_ISSUER_ACTIVE, 4)}</code>.
        </div>
        <button type="button" className="btn btn-ghost" onClick={clearKey}>
          Disconnect key
        </button>
      </div>
    );
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        const result = saveKey(value);
        if (!result.ok) {
          setError(result.error ?? "Could not use that key.");
          return;
        }
        setError(null);
        setSaved(true);
      }}
    >
      <div className="field">
        <label htmlFor="pollar-key">Pollar publishable key</label>
        <input
          id="pollar-key"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="pub_testnet_…"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="hint">
          Create an app at{" "}
          <a className="link" href="https://dashboard.pollar.xyz" target="_blank" rel="noreferrer">
            dashboard.pollar.xyz
          </a>{" "}
          → Build → API Keys. Testnet keys are issued instantly; mainnet needs your own
          identity verification. The publishable key is safe in a browser; never paste a
          <code> sec_ </code> key here.
        </span>
      </div>
      {error ? <div className="note note-bad">{error}</div> : null}
      {saved ? <div className="note note-good">Key saved on this device.</div> : null}
      <button type="submit" className="btn btn-primary btn-block">
        Connect Pollar
      </button>
    </form>
  );
}

export function SignInPanel() {
  const {
    status,
    authStep,
    authMessage,
    address,
    email,
    balanceUsdc,
    usdcTrustline,
    usdcEnabledInApp,
    ensureUsdcTrustline,
    loginGoogle,
    beginEmail,
    sendEmailCode,
    verifyEmailCode,
    cancelLogin,
    signOut,
    refreshBalance,
  } = usePollar();

  const [mail, setMail] = useState("");
  const [code, setCode] = useState("");
  const [trustMsg, setTrustMsg] = useState<string | null>(null);
  const [mailError, setMailError] = useState<string | null>(null);
  /** Guards against sending the code twice for the same `entering_email` step. */
  const autoSentRef = useRef(false);

  // The SDK tells us when it is ready for the address: `beginEmailLogin()` lands in
  // `entering_email`, and only then does `sendEmailCode` have a session to send on.
  // Waiting for that state beats guessing with a timer.
  useEffect(() => {
    if (status !== "authenticating") {
      autoSentRef.current = false;
      return;
    }
    if (authStep !== "entering_email") return;
    if (autoSentRef.current) return;
    if (!mail.includes("@")) return;
    autoSentRef.current = true;
    sendEmailCode(mail.trim());
  }, [status, authStep, mail, sendEmailCode]);

  if (status === "ready" && address) {
    return (
      <div className="stack">
        <div className="note note-good">
          Signed in{email ? ` as ${email}` : ""} — your own non-custodial Stellar wallet.
        </div>
        <div className="lcd">
          <div className="lcd-label">Your wallet · {NETWORK}</div>
          <div className="lcd-value" style={{ fontSize: 15, wordBreak: "break-all" }}>
            {shortAddr(address, 8)}
          </div>
          <div className="lcd-sub">USDC balance</div>
          <div className="lcd-value">{fmtUsdcDisplay(balanceUsdc)}</div>
          <div className="lcd-sub">USDC trustline</div>
          <div className="lcd-value" style={{ fontSize: 15 }}>
            {usdcTrustline === null
              ? "checking…"
              : usdcTrustline
                ? "established"
                : "missing"}
          </div>
        </div>
        {usdcEnabledInApp === false ? (
          <div className="note note-warn">
            USDC is not enabled for this app yet — add it in the Pollar dashboard under Build →
            Tokens / Trustlines, or no wallet can hold it.
          </div>
        ) : null}
        {trustMsg ? <div className="note note-info">{trustMsg}</div> : null}
        <div className="cta-row" style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshBalance}>
            Refresh balance
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setTrustMsg("Preparing the USDC trustline…");
              void ensureUsdcTrustline().then((result) =>
                setTrustMsg(result.ok ? "USDC trustline ready." : result.message ?? "Failed.")
              );
            }}
          >
            Prepare USDC
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (status === "authenticating") {
    return (
      <div className="stack">
        <div className="note note-info">
          {STEP_COPY[authStep] ?? "Working…"} Follow the prompt if a window opened.
        </div>

        {authStep === "entering_email" || authStep === "sending_email" ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!mail.includes("@")) {
                setMailError("That does not look like an email address.");
                return;
              }
              setMailError(null);
              sendEmailCode(mail.trim());
            }}
          >
            <div className="field">
              <label htmlFor="email-retry">Email</label>
              <input
                id="email-retry"
                type="email"
                value={mail}
                onChange={(event) => setMail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <span className="hint">
                {authStep === "sending_email"
                  ? "Sending… if nothing arrives in a minute, send it again."
                  : "We will email you a six-digit code."}
              </span>
            </div>
            {mailError ? <div className="note note-bad">{mailError}</div> : null}
            <button type="submit" className="btn btn-primary btn-block">
              Send my code
            </button>
          </form>
        ) : null}

        {authStep === "entering_code" ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim().length >= 4) verifyEmailCode(code.trim());
            }}
          >
            <div className="field">
              <label htmlFor="otp">Email code</label>
              <input
                id="otp"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                placeholder="123456"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Verify code
            </button>
          </form>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={cancelLogin}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {authMessage ? <div className="note note-bad">{authMessage}</div> : null}
      {mailError ? <div className="note note-bad">{mailError}</div> : null}
      <button type="button" className="btn btn-primary btn-block" onClick={loginGoogle}>
        🔵 Continue with Google
      </button>
      <div className="center tiny muted">or</div>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!mail.includes("@")) {
            setMailError("That does not look like an email address.");
            return;
          }
          setMailError(null);
          // Hands off to the `entering_email` step, which sends the code once the
          // SDK says its session is ready.
          beginEmail();
        }}
      >
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={mail}
            onChange={(event) => setMail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <span className="hint">
            No seed phrase and no extension: Pollar creates a Stellar wallet for you and
            sponsors the network fee.
          </span>
        </div>
        <button type="submit" className="btn btn-ghost btn-block">
          Email me a sign-in code
        </button>
      </form>
    </div>
  );
}

export function AuthCard() {
  const { hasKey } = usePollar();
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">{hasKey ? "Your wallet" : "Connect Pollar first"}</span>
      </div>
      {hasKey ? <SignInPanel /> : <KeyForm />}
    </div>
  );
}
