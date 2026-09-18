import { AuthCard, KeyForm } from "../components/AuthPanel";
import { Disclosure } from "../components/Disclosure";
import { CIRCLE_NAMES } from "../data/names";
import { FAUCETS, NETWORK, USDC_ISSUER_ACTIVE } from "../lib/config";
import { usePollar } from "../lib/pollar";
import { shortAddr } from "../lib/format";
import { useLang } from "../lib/i18n";

export function HowItWorks() {
  const { t } = useLang();
  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <h1 className="display display-sm">No pot to steal</h1>
      <p className="hero-sub">A savings circle with no cash box.</p>

      <div className="grid-3">
        {[
          {
            title: `1 · ${t("step.contribute")}`,
            body: t("step.contributeBody"),
          },
          {
            title: `2 · ${t("step.settle")}`,
            body: t("step.settleBody"),
          },
          {
            title: `3 · ${t("step.verify")}`,
            body: t("step.verifyBody"),
          },
        ].map((item) => (
          <div className="card" key={item.title}>
            <div className="card-title">{item.title}</div>
            <p className="tiny muted" style={{ marginBottom: 0 }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <Disclosure
        title="Why the old model breaks"
        summary="one organiser holds everyone's money"
      >
      <div className="grid-2">
        <div className="card">
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.75, marginTop: 0 }}>
            A traditional circle concentrates everything in one person: they collect, keep the
            notebook, and hand over the lump sum. An organiser who leaves with the money destroys
            everyone else's savings.
          </p>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.75 }}>
            Existing tools rebuilt the notebook — reminders, due dates, reports — while the cash
            still ended up in someone's hands.
          </p>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">{t("chips.title")}</span>
          </div>
          <div className="name-strip">
            {CIRCLE_NAMES.map((entry) => (
              <span key={entry.label} className={`name-chip ${entry.region}`}>
                {entry.label}
              </span>
            ))}
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            One institution, dozens of names, both sides of the Atlantic.
          </p>
        </div>
      </div>
      </Disclosure>

      <h2 className="section-title">{t("real.title")}</h2>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">{t("real.working")}</span>
          </div>
          <ul className="tiny muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li>Wallets created behind an email login — no keys to manage</li>
            <li>USDC contributions signed by each member's own wallet</li>
            <li>Round status read from Horizon, with explorer receipts</li>
            <li>Circles shared by link, with no registry</li>
          </ul>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">{t("real.gaps")}</span>
          </div>
          <ul className="tiny muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li>
              <strong>Default risk is real.</strong> If a member never pays, the recipient is short
              that round. The chain makes them visible, not liable.
            </li>
            <li>
              Cash-out runs through Pollar's ramps: Bolivia, Brazil, Colombia, Mexico. Every
              corridor is Latin American — mobile money across Africa is the next leg.
            </li>
            <li>No offline or USSD entry point yet.</li>
          </ul>
        </div>
      </div>

      <div className="note note-info" style={{ marginTop: 20 }}>
        Susunaku coordinates a schedule and shows proof. It never takes custody, never pools funds
        and never guarantees a payout.
      </div>
    </div>
  );
}

export function Setup() {
  const { hasKey, keyNet, address } = usePollar();

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <h1 className="display display-sm">Connect Pollar</h1>
      <p className="hero-sub">A non-custodial Stellar wallet behind a familiar login.</p>

      <div className="stack">
        {hasKey ? <AuthCard /> : <div className="card"><KeyForm /></div>}

        <div className="card">
          <div className="card-head">
            <span className="card-title">Network</span>
          </div>
          <div className="lcd">
            <div className="lcd-label">Running on</div>
            <div className="lcd-value">{NETWORK.toUpperCase()}</div>
            <div className="lcd-sub">
              USDC issuer {shortAddr(USDC_ISSUER_ACTIVE, 5)}
              {keyNet ? ` · key: ${keyNet}` : ""}
            </div>
          </div>
          {NETWORK === "testnet" ? (
            <div className="note note-warn" style={{ marginTop: 12 }}>
              On testnet a wallet needs a little XLM for the fee:{" "}
              <a className="link" href={FAUCETS.xlm} target="_blank" rel="noreferrer">
                Friendbot
              </a>{" "}
              for XLM,{" "}
              <a className="link" href={FAUCETS.usdc} target="_blank" rel="noreferrer">
                Circle
              </a>{" "}
              for USDC. Operators can sponsor fees under Treasury → Sponsorship.
            </div>
          ) : (
            <div className="note note-bad" style={{ marginTop: 12 }}>
              You are on mainnet: contributions are real money and cannot be undone. Check the
              member list before paying.
            </div>
          )}
        </div>

        {address ? (
          <div className="card">
            <div className="card-head">
              <span className="card-title">Your wallet</span>
            </div>
            <div className="field">
              <label>Stellar address</label>
              <input readOnly value={address} onFocus={(e) => e.currentTarget.select()} />
              <span className="hint">What a circle needs from you. Only you control it.</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
