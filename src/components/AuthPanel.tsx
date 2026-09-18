import { useState } from "react";
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
        </div>
        <div className="cta-row" style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshBalance}>
            Refresh balance
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
      <button type="button" className="btn btn-primary btn-block" onClick={loginGoogle}>
        🔵 Continue with Google
      </button>
      <div className="center tiny muted">or</div>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!mail.includes("@")) return;
          beginEmail();
          window.setTimeout(() => sendEmailCode(mail.trim()), 150);
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
