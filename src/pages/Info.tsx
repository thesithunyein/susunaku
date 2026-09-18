import { AuthCard, KeyForm } from "../components/AuthPanel";
import { Disclosure } from "../components/Disclosure";
import { CIRCLE_NAMES } from "../data/names";
import { FAUCETS, NETWORK, USDC_ISSUER_ACTIVE } from "../lib/config";
import { usePollar } from "../lib/pollar";
import { shortAddr } from "../lib/format";

export function HowItWorks() {
  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <h1 className="display display-sm">No pot to steal</h1>
      <p className="hero-sub">
        A savings circle is a promise about the future. Susunaku keeps the promise without asking
        anyone to hold the money.
      </p>

      <div className="grid-3">
        {[
          {
            title: "1 · Contribute",
            body: "Each round, every member pays the round's recipient from their own wallet. Not to a pool — to a person.",
          },
          {
            title: "2 · Settle",
            body: "USDC on Stellar settles in about five seconds. Stellar's fee is a hundredth of a cent, paid in XLM from your own wallet — Pollar sponsors the wallet and its trustlines, not that fee.",
          },
          {
            title: "3 · Verify",
            body: "Round status is read from the chain. Anyone can open the transaction and check who paid whom, without trusting us or an organiser.",
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
        summary="one trusted organiser is also one single point of failure"
      >
      <div className="grid-2">
        <div className="card">
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.75, marginTop: 0 }}>
            A traditional circle concentrates everything into one person: they collect the
            contributions, keep the notebook and hand over the lump sum. That single point of
            trust is also a single point of failure — an organiser who leaves with the round's
            money destroys the circle and the savings of everyone in it.
          </p>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.75 }}>
            The digital tools that exist mostly rebuilt the notebook: reminders, due dates and
            reports, while the cash still ends up in someone's hands. Susunaku changes the
            movement itself.
          </p>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Same institution, two continents</span>
          </div>
          <div className="name-strip">
            {CIRCLE_NAMES.map((entry) => (
              <span key={entry.label} className={`name-chip ${entry.region}`}>
                {entry.label}
              </span>
            ))}
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            Susunaku is a blend of <em>susu</em> (West Africa) and <em>pasanaku</em> (the Andes):
            the same rotating circle, under dozens of names, on both sides of the Atlantic.
          </p>
        </div>
      </div>
      </Disclosure>

      <h2 className="section-title">What is real today, and what is not</h2>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Working now</span>
          </div>
          <ul className="tiny muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li>Non-custodial wallets created behind an email login, via Pollar</li>
            <li>Real USDC contributions, signed by each member's own wallet</li>
            <li>Round confirmation read from Horizon, with explorer receipts</li>
            <li>Circles shared entirely by link, with no server-side registry</li>
            <li>Exportable on-chain history for anyone who wants to audit a round</li>
          </ul>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Honest gaps</span>
          </div>
          <ul className="tiny muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li>
              <strong>Default risk is real.</strong> If a member never pays, the recipient is short
              that round. The chain makes the defaulter visible; it does not make them pay.
              Collateral and pre-funded rounds are the next step.
            </li>
            <li>
              Cash-out to local currency runs through Pollar's ramps (Bolivia, Brazil, Colombia and
              Mexico today — every corridor Pollar can execute is Latin American). Mobile money
              across Africa is the leg we want next, and the one that decides whether a circle with
              members in Ghana and Nairobi is usable or merely demonstrable.
            </li>
            <li>No offline or USSD entry point yet — smartphone required for now.</li>
          </ul>
        </div>
      </div>

      <div className="note note-info" style={{ marginTop: 20 }}>
        Legal note: Susunaku coordinates a schedule and displays proof. It never takes custody,
        never pools funds and never guarantees a payout. Anything that changes that would change
        the regulatory picture, so it is deliberately out of scope.
      </div>
    </div>
  );
}

export function Setup() {
  const { hasKey, keyNet, address } = usePollar();

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <h1 className="display display-sm">Connect Pollar</h1>
      <p className="hero-sub">
        Pollar gives each member a non-custodial Stellar wallet behind a familiar login. Susunaku
        uses it for identity, the wallet address and payments.
      </p>

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
              On testnet, a wallet needs a little XLM for the network fee before it can contribute:{" "}
              <a className="link" href={FAUCETS.xlm} target="_blank" rel="noreferrer">
                Friendbot
              </a>{" "}
              for XLM and the{" "}
              <a className="link" href={FAUCETS.usdc} target="_blank" rel="noreferrer">
                Circle faucet
              </a>{" "}
              for test USDC. Pollar sponsors the wallet and its trustlines; the operator can also
              sponsor payment fees (Dashboard → Treasury → Sponsorship) and give new wallets a
              starting XLM balance (Account Funding). Going to mainnet means a separate Pollar app,
              a <code>pub_mainnet_</code> key and funded funding + gas wallets.
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
              <span className="hint">
                This is what a circle needs from you. It is a real account on Stellar that only
                you control — Pollar cannot move your funds.
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
