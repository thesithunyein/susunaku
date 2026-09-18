import { useEffect, useMemo, useState } from "react";
import {
  CADENCE_LABEL,
  contributorsOf,
  findMember,
  isComplete,
  paymentsPerMemberPerYear,
  roundValue,
  roundsRemaining,
  roundWindow,
  totalRounds,
  type Circle,
} from "../lib/circle";
import { USDC_ISSUER_ACTIVE, NETWORK } from "../lib/config";
import { fmtCountdown, fmtDate, fmtUsdcDisplay, initials, shortAddr } from "../lib/format";
import { usePollar } from "../lib/pollar";
import { circleShareUrl } from "../lib/share";
import { useCircles } from "../lib/store";
import { useRoundStatus } from "../lib/useRoundStatus";
import { Chest, Toy } from "../components/art";
import { AuthCard, KeyForm } from "../components/AuthPanel";
import { CorridorPanel } from "../components/CorridorPanel";
import { CIRCLE_NAMES } from "../data/names";

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function NameStrip() {
  return (
    <div className="name-strip">
      {CIRCLE_NAMES.map((entry) => (
        <span key={entry.label} className={`name-chip ${entry.region}`}>
          {entry.label}
        </span>
      ))}
    </div>
  );
}

function StatusChip({ state }: { state: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    receiving: { cls: "chip-receives", label: "receives" },
    paid: { cls: "chip-paid", label: "paid" },
    due: { cls: "chip-due", label: "due" },
    "no-wallet": { cls: "chip-due", label: "no wallet" },
    checking: { cls: "chip-due", label: "checking" },
    unreachable: { cls: "chip-due", label: "unverified" },
  };
  const item = map[state] ?? map.checking;
  return <span className={`chip ${item.cls}`}>{item.label}</span>;
}

export function Home({
  circleId,
  openAuth,
}: {
  circleId?: string;
  openAuth: () => void;
}) {
  const circles = useCircles();
  const circle = useMemo<Circle | undefined>(
    () => (circleId ? circles.find((c) => c.id === circleId) : circles[0]),
    [circles, circleId]
  );
  const now = useNow();
  const pollar = usePollar();
  const { round, recipient, statuses, loading, checkedAt, refresh } = useRoundStatus(
    circle ?? null
  );

  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState<{ kind: "ok" | "bad"; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  if (!circle) {
    return (
      <>
        <section className="hero">
          <div className="kicker">Susunaku · savings circles settled in USDC on Stellar</div>
          <h1 className="display">$0.00</h1>
          <p className="hero-sub">
            That is how much of your money Susunaku holds. It will stay that way.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#/new">
              🧰 Create a circle
            </a>
            <span className="marker" />
          </div>
        </section>

        <div className="wrap">
          <div className="grid-2" style={{ marginTop: 34 }}>
            <div className="card">
              <div className="card-head">
                <span className="card-title">The problem, in one line</span>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
                A rotating savings circle has exactly one weak point: one person holds the
                pooled cash and keeps the notebook. When that person disappears, whoever's
                turn it was loses everything — and the circle dies with them.
              </p>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
                Every digital tool so far rebuilt the notebook. Susunaku removes the vault:
                each round, members pay the recipient directly. Nothing is ever pooled, so
                there is no custodian — and no pot to steal.
              </p>
              <div className="note note-info tiny">
                Susunaku never holds funds, never escrows and has no treasury address. Your
                wallet is your own, created through Pollar, and it stays yours.
              </div>
            </div>
            <div className="stack">
              <AuthCard />
              <CorridorPanel />
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Same institution, two continents</span>
                </div>
                <NameStrip />
              </div>
            </div>
          </div>

          <h2 className="section-title">What happens in a round</h2>
          <div className="grid-3">
            {[
              ["1 · Contribute", "Every member pays the round's recipient from their own wallet."],
              ["2 · Settle", "USDC moves wallet to wallet on Stellar in about five seconds."],
              ["3 · Verify", "Anyone can check the round on-chain. No one has to be trusted."],
            ].map(([title, body]) => (
              <div className="card" key={title}>
                <div className="card-title">{title}</div>
                <p className="tiny muted" style={{ marginBottom: 0 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const contributors = contributorsOf(circle, round);
  const window_ = roundWindow(circle, round);
  const value = roundValue(circle, round);
  const remaining = Math.max(0, window_.end - now);
  const paidCount = statuses.filter((s) => s.state === "paid").length;
  const me = findMember(circle, pollar.address);
  const iAmRecipient = Boolean(me && recipient && me.id === recipient.id);
  const iAmContributor = Boolean(me && !iAmRecipient);
  const collectedNow = paidCount * circle.amountUsdc;
  const finished = isComplete(circle, now);
  // A Stellar payment's fee comes out of the sender's own XLM, so a wallet
  // holding none cannot submit at all — the SDK refuses client-side. Better to
  // say so before the click than to surface "Not enough XLM" afterwards.
  const xlmValue = pollar.xlmBalance === null ? null : Number(pollar.xlmBalance);
  const lowGas = xlmValue !== null && Number.isFinite(xlmValue) && xlmValue < 0.0001;

  const runPay = async () => {
    if (!recipient?.address) return;
    setPaying(true);
    setPayMessage(null);
    try {
      const outcome = await pollar.pay({
        destination: recipient.address,
        amount: circle.amountUsdc,
      });
      if (outcome.status === "error") {
        setPayMessage({
          kind: "bad",
          text: outcome.message ?? outcome.details ?? "The payment did not go through.",
        });
      } else {
        setPayMessage({
          kind: "ok",
          text: `Paid ${circle.amountUsdc} USDC — ${shortAddr(outcome.hash, 8)}. Verifying on-chain…`,
        });
        window.setTimeout(refresh, 2500);
      }
    } catch (err) {
      setPayMessage({
        kind: "bad",
        text: err instanceof Error ? err.message : "Payment failed.",
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="kicker">
          Round {round + 1} of {totalRounds(circle)} ·{" "}
          {loading ? "checking the chain…" : `${paidCount}/${contributors.length} paid`}
        </div>
        <h1 className="display">${fmtUsdcDisplay(value)}</h1>
        <p className="hero-sub">
          {circle.name} · {fmtUsdcDisplay(circle.amountUsdc)} USDC {CADENCE_LABEL[circle.cadence]} ·
          paying <strong>{recipient?.name ?? "—"}</strong>{" "}
          {recipient?.country ? `in ${recipient.country}` : ""}
        </p>

        <div className="cta-row">
          {!pollar.hasKey ? (
            <button type="button" className="btn btn-primary" onClick={openAuth}>
              🐻‍❄️ Connect Pollar to pay
            </button>
          ) : !pollar.address ? (
            <button type="button" className="btn btn-primary" onClick={openAuth}>
              👤 Sign in to pay
            </button>
          ) : iAmContributor ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={runPay}
              disabled={paying || pollar.txPending || finished}
            >
              {paying || pollar.txPending ? <span className="spin" /> : "💵"} Pay my
              contribution — {fmtUsdcDisplay(circle.amountUsdc)} USDC
            </button>
          ) : iAmRecipient ? (
            <span className="btn btn-primary" style={{ cursor: "default", opacity: 0.92 }}>
              👑 You receive this round
            </span>
          ) : (
            <span className="btn btn-primary" style={{ cursor: "default", opacity: 0.92 }}>
              This circle is not linked to your wallet
            </span>
          )}
          <span className="marker" />
        </div>

        {lowGas && iAmContributor ? (
          <div
            className="note note-warn"
            style={{ maxWidth: 560, margin: "14px auto 0", textAlign: "left" }}
          >
            This wallet holds no XLM. Stellar takes a payment's fee from the sender's own
            balance — Pollar sponsors the wallet and its trustlines, not that fee — so this
            contribution would be refused before it is submitted. Add a little XLM (a few cents
            covers thousands of payments) and try again.
          </div>
        ) : null}
        {payMessage ? (
          <div
            className={`note ${payMessage.kind === "ok" ? "note-good" : "note-bad"}`}
            style={{ maxWidth: 560, margin: "14px auto 0", textAlign: "left" }}
          >
            {payMessage.text}
          </div>
        ) : null}
        {finished ? (
          <div className="note note-info" style={{ maxWidth: 560, margin: "14px auto 0" }}>
            Every member has had a turn. The circle has completed all {totalRounds(circle)} rounds.
          </div>
        ) : null}

        <div className="stage">
          <div className="prop">
            <Chest
              label="Left to collect"
              value={`$${fmtUsdcDisplay(Math.max(0, value - collectedNow))}`}
              sub={`${paidCount} of ${contributors.length} in`}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            {(recipient ? [recipient, ...contributors] : contributors).slice(0, 6).map((member, index) => (
              <div className="prop" key={member.id} style={{ textAlign: "center" }}>
                <Toy index={index} size={58} />
                <div className="tiny" style={{ fontWeight: 700 }}>
                  {member.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="grid-2">
          <div className="stack">
            <div className="card" id="members">
              <div className="card-head">
                <span className="card-title">
                  Round {(round + 1)} status · read from Stellar
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
                  {loading ? "Checking…" : "Re-check"}
                </button>
              </div>
              <div className="members">
                {statuses.map((status) => (
                  <div
                    key={status.member.id}
                    className={`member ${status.state === "receiving" ? "member-receives" : ""}`}
                  >
                    <div
                      className="member-avatar"
                      style={{
                        background:
                          status.state === "receiving"
                            ? "var(--yellow-dark)"
                            : status.state === "paid"
                              ? "var(--green)"
                              : "var(--muted-2)",
                      }}
                    >
                      {initials(status.member.name)}
                    </div>
                    <div>
                      <div className="member-name">
                        {status.member.name}
                        {status.member.isMe ? <span className="chip chip-flag">you</span> : null}
                        <StatusChip state={status.state} />
                      </div>
                      <div className="member-meta">
                        {status.member.country ? `${status.member.country} · ` : ""}
                        {shortAddr(status.member.address, 6)}
                        {status.detail ? ` · ${status.detail}` : ""}
                      </div>
                    </div>
                    <div>
                      {status.payment ? (
                        <a
                          className="link tiny"
                          href={status.payment.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          receipt ↗
                        </a>
                      ) : (
                        <span className="tiny muted">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="tiny muted" style={{ marginTop: 12 }}>
                {checkedAt
                  ? `Last chain check ${fmtDate(checkedAt)}. Status is derived from Horizon, not from a database we control.`
                  : "Waiting for the first chain check…"}
              </div>
            </div>

            <div className="card" id="receipts">
              <div className="card-head">
                <span className="card-title">Receipts this round</span>
              </div>
              {statuses.filter((s) => s.payment).length === 0 ? (
                <p className="tiny muted" style={{ margin: 0 }}>
                  No payments confirmed for round {round + 1} yet.
                </p>
              ) : (
                <table className="receipts">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Amount</th>
                      <th>Transaction</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses
                      .filter((s) => s.payment)
                      .map((s) => (
                        <tr key={s.member.id}>
                          <td>{s.member.name}</td>
                          <td>{fmtUsdcDisplay(s.payment?.amount)} USDC</td>
                          <td>
                            <a
                              className="link"
                              href={s.payment?.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <code>{shortAddr(s.payment?.hash, 8)}</code> ↗
                            </a>
                          </td>
                          <td className="tiny muted">{fmtDate(s.payment?.createdAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="card-head">
                <span className="card-title">The whole point</span>
              </div>
              <div className="proof">
                <div className="lcd">
                  <div className="lcd-label">Held by Susunaku</div>
                  <div className="lcd-value">$0.00</div>
                  <div className="lcd-sub">No treasury address exists</div>
                </div>
                <span className="proof-vs">vs</span>
                <div className="lcd">
                  <div className="lcd-label">This round</div>
                  <div className="lcd-value">${fmtUsdcDisplay(value)}</div>
                  <div className="lcd-sub">Straight to {recipient?.name ?? "the recipient"}</div>
                </div>
              </div>
              <p className="tiny muted">
                Every contribution in this round moves from a member's own wallet to the
                recipient's own wallet. There is no intermediate account, no pooled balance
                and no operator holding the float — which is also why nothing here needs a
                license to custody money.
              </p>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">Round clock</span>
              </div>
              <div className="lcd">
                <div className="lcd-label">This round ends in</div>
                <div className="lcd-value">{finished ? "CLOSED" : fmtCountdown(remaining)}</div>
                <div className="lcd-sub">
                  Closes {fmtDate(window_.end)} · {roundsRemaining(circle, now)}
                  {roundsRemaining(circle, now) === 1 ? " round" : " rounds"} after this
                </div>
              </div>
              <div className="tiny muted" style={{ marginTop: 12 }}>
                <div>
                  <strong>{fmtUsdcDisplay(paymentsPerMemberPerYear(circle))}</strong> payments per
                member per year at this cadence — the reason frequent circles beat monthly ones.
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">Invite the rest of the circle</span>
              </div>
              <p className="tiny muted">
                The whole circle travels in one link: amount, cadence, members and rotation
                order. Nobody has to register anywhere for the circle to exist.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  const url = circleShareUrl(circle);
                  void navigator.clipboard?.writeText(url).then(
                    () => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2200);
                    },
                    () => setCopied(false)
                  );
                }}
              >
                {copied ? "Link copied ✓" : "Copy invite link"}
              </button>
              <div className="tiny muted" style={{ marginTop: 12 }}>
                <div>
                  Rotation: {circle.order.map((id) => circle.members.find((m) => m.id === id)?.name).join(" → ")}
                </div>
                <div>USDC issuer {shortAddr(USDC_ISSUER_ACTIVE, 4)} · {NETWORK}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                style={{ marginTop: 10 }}
                onClick={() => (window.location.hash = "#/new")}
              >
                Start another circle
              </button>
            </div>

            {pollar.hasKey ? <AuthCard /> : <div className="card"><KeyForm /></div>}
            <CorridorPanel />
          </div>
        </div>
      </div>
    </>
  );
}
