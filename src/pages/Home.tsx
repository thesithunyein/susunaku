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
import { KeyForm, SignInPanel } from "../components/AuthPanel";
import { CorridorPanel } from "../components/CorridorPanel";
import { Disclosure } from "../components/Disclosure";
import {
  IconCheck,
  IconCopy,
  IconExternal,
  IconPlus,
  IconRefresh,
  IconSend,
  IconUser,
  IconWallet,
} from "../components/icons";
import { CIRCLE_NAMES } from "../data/names";
import HeroToy from "../components/HeroToy";

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

/**
 * The product, for a page that has no account data to show.
 *
 * A visitor with no session has nothing to look at, and a blank canvas is a worse
 * first impression than a short answer: three steps, then what actually changes
 * against the circle everyone already knows. Short strings and a table, not prose.
 */
function ProductIntro() {
  const steps: Array<[string, string, string]> = [
    ["01", "Contribute", "Every member except the recipient pays them, wallet to wallet."],
    ["02", "Settle", "USDC on Stellar — seconds, for a hundredth of a cent."],
    ["03", "Verify", "Each payment is a public transaction anyone can open."],
  ];
  const changes: Array<[string, string, string]> = [
    ["Who holds the money", "The organiser", "Nobody"],
    ["The record", "A notebook", "The chain"],
    ["A member abroad", "Locked out", "In the circle"],
    ["If the organiser leaves", "Savings gone", "Nothing to take"],
  ];

  return (
    <>
      <div className="grid-3">
        {steps.map(([n, title, body]) => (
          <div className="card" key={n}>
            <div className="step-n">{n}</div>
            <div className="card-title">{title}</div>
            <p className="tiny muted" style={{ marginBottom: 0 }}>
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">What changes</span>
        </div>
        <div className="compare">
          <div className="compare-row compare-head">
            <span />
            <span>Traditional circle</span>
            <span>On Susunaku</span>
          </div>
          {changes.map(([label, before, after]) => (
            <div className="compare-row" key={label}>
              <span className="compare-label">{label}</span>
              <span className="compare-old">{before}</span>
              <span className="compare-new">{after}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Same institution, two continents</span>
        </div>
        <NameStrip />
      </div>
    </>
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

  // An invite link is the one thing that has to work without an account: the
  // whole circle travels in the URL, so we can honestly show it. Anything else
  // signed out is an empty product — no placeholder stats, no account panels
  // for an account nobody has.
  const fromInvite = Boolean(circleId);

  if (!pollar.address && !fromInvite) {
    return (
      <>
        {/* Hero + mascot are one viewport-filling column: the toy flexes to
            exactly the space left in the first screen, so he is never a head
            peeking over the fold. */}
        <div className="empty-first">
          <section className="hero hero-empty">
            <div className="kicker">Savings circles on Stellar</div>
            <h1 className="display display-sm">No circles yet</h1>
            <p className="hero-sub">
              Members pay each other directly in USDC, so there is no pot and nobody holding it.
            </p>
            <div className="cta-row">
              <button type="button" className="btn btn-primary" onClick={openAuth}>
                <IconUser size={18} /> Sign in
              </button>
              <a className="btn btn-ghost" href="#/how">
                How it works
              </a>
            </div>
          </section>

          <HeroToy />
        </div>

        {/* An account is empty. The page is not: with no data to show, it shows
            the product — three steps and what actually changes. */}
        <div className="wrap">
          <div className="stack" style={{ marginTop: 30 }}>
            <ProductIntro />
          </div>
        </div>
      </>
    );
  }

  if (!circle) {
    return (
      <>
        <div className="empty-first">
          <section className="hero hero-empty">
            <div className="kicker">No circle on this device</div>
            <h1 className="display display-sm">No circles yet</h1>
            <p className="hero-sub">
              Start one and it opens here — amount, cadence, members, rotation order.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#/new">
                <IconPlus size={18} /> Start a circle
              </a>
              <a className="btn btn-ghost" href="#/how">
                How it works
              </a>
            </div>
          </section>

          <HeroToy />
        </div>

        <div className="wrap">
          <div className="stack" style={{ marginTop: 30 }}>
            <ProductIntro />
          </div>

          {/* The product, then the account: a single column reads as one page, where
              a two-column grid here left half the width empty. */}
          <div className="stack" style={{ marginTop: 26 }}>
            <div className="stack">
              <Disclosure
                title={pollar.address ? "Your wallet" : "Sign in"}
                summary={
                  pollar.address
                    ? shortAddr(pollar.address, 4)
                    : pollar.hasKey
                      ? "email code · no seed phrase"
                      : "connect Pollar first"
                }
                defaultOpen={!circle}
              >
                {pollar.hasKey ? <SignInPanel /> : <KeyForm />}
              </Disclosure>
              {pollar.address ? (
                <Disclosure title="Money in and out" summary="fund a seat · cash out a round">
                  <CorridorPanel bare />
                </Disclosure>
              ) : null}
            </div>
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
  const receiptCount = statuses.filter((s) => s.payment).length;

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

  const primaryAction = !pollar.hasKey ? (
    <button type="button" className="btn btn-primary" onClick={openAuth}>
      <IconWallet size={18} /> Connect Pollar to pay
    </button>
  ) : !pollar.address ? (
    <button type="button" className="btn btn-primary" onClick={openAuth}>
      <IconUser size={18} /> Sign in to pay
    </button>
  ) : iAmContributor ? (
    <button
      type="button"
      className="btn btn-primary"
      onClick={runPay}
      disabled={paying || pollar.txPending || finished}
    >
      {paying || pollar.txPending ? <span className="spin" /> : <IconSend size={18} />}
      Pay my contribution — {fmtUsdcDisplay(circle.amountUsdc)} USDC
    </button>
  ) : iAmRecipient ? (
    <span className="btn btn-primary" style={{ cursor: "default", opacity: 0.92 }}>
      <IconCheck size={18} /> You receive this round
    </span>
  ) : (
    <span className="btn btn-primary" style={{ cursor: "default", opacity: 0.92 }}>
      This circle is not linked to your wallet
    </span>
  );

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
          {primaryAction}
        </div>

        {lowGas && iAmContributor ? (
          <div
            className="note note-warn"
            role="status"
            style={{ maxWidth: 560, margin: "14px auto 0", textAlign: "left" }}
          >
            This wallet has no XLM. Stellar charges the sender a fee, so the payment won't submit.
            Add a little XLM to continue.
          </div>
        ) : null}
        {/* A payment that succeeds or fails has to be announced, not just
            coloured: a screen-reader user gets no other signal. */}
        {payMessage ? (
          <div
            className={`note ${payMessage.kind === "ok" ? "note-good" : "note-bad"}`}
            role={payMessage.kind === "ok" ? "status" : "alert"}
            aria-live={payMessage.kind === "ok" ? "polite" : "assertive"}
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

      </section>

      <div className="wrap">
        {/* Three numbers answer the whole page. Everything below is optional. */}
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Paid in</span>
            <strong>
              {paidCount}/{contributors.length}
            </strong>
          </div>
          <div className="stat">
            <span className="stat-label">Left to collect</span>
            <strong>${fmtUsdcDisplay(Math.max(0, value - collectedNow))}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Recipient</span>
            <strong>{recipient?.name ?? "—"}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Closes in</span>
            <strong>{finished ? "closed" : fmtCountdown(remaining)}</strong>
          </div>
        </div>

        <div className="grid-2">
          <div className="stack">
            <Disclosure
              id="members"
              title="Who has paid"
              summary={loading ? "checking…" : `${paidCount} of ${contributors.length} · from Stellar`}
              defaultOpen
            >
              <div className="members">
                {statuses.map((status) => (
                  <div
                    key={status.member.id}
                    className={`member ${status.state === "receiving" ? "member-receives" : ""}`}
                  >
                    {/* The state is already said twice in words — the chip and the
                        row ring. A third, colour-coded avatar only adds noise. */}
                    <div className="member-avatar">{initials(status.member.name)}</div>
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
                          receipt <IconExternal size={12} />
                        </a>
                      ) : (
                        <span className="tiny muted">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-foot">
                <span className="tiny muted">
                  {checkedAt
                    ? `Checked on-chain ${fmtDate(checkedAt)} — from Horizon, not our database`
                    : "Waiting for the first chain check…"}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
                  <IconRefresh size={15} />
                  {loading ? "Checking…" : "Re-check"}
                </button>
              </div>
            </Disclosure>

            <Disclosure
              id="receipts"
              title="Receipts"
              summary={
                receiptCount === 0
                  ? "none confirmed yet"                  : `${receiptCount} confirmed · public`}
            >
              {receiptCount === 0 ? (
                <p className="tiny muted" style={{ margin: 0 }}>
                  No payments confirmed for round {round + 1} yet.
                </p>
              ) : (
                <div className="table-scroll">
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
                                <code>{shortAddr(s.payment?.hash, 8)}</code>
                              </a>
                            </td>
                            <td className="tiny muted">{fmtDate(s.payment?.createdAt)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Disclosure>

            <Disclosure title="Why there is no pot" summary="$0.00 held · no treasury address">
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
                Member to recipient, directly. No pooled balance, no operator float.
              </p>
              <div className="lcd">
                <div className="lcd-label">This round ends in</div>
                <div className="lcd-value">{finished ? "CLOSED" : fmtCountdown(remaining)}</div>
                <div className="lcd-sub">
                  {roundsRemaining(circle, now)} rounds after this ·{" "}
                  {paymentsPerMemberPerYear(circle)} payments per member a year
                </div>
              </div>
            </Disclosure>
          </div>

          <div className="stack">
            <Disclosure
              title="Invite the circle"
              summary={`${circle.members.length} members · one link, no sign-up`}
            >
              <p className="tiny muted">
                Amount, cadence, members and rotation travel in one link.
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
                <IconCopy size={15} />
                {copied ? "Link copied" : "Copy invite link"}
              </button>
              <div className="tiny muted" style={{ marginTop: 12 }}>
                <div>
                  Rotation:{" "}
                  {circle.order
                    .map((id) => circle.members.find((m) => m.id === id)?.name)
                    .join(" → ")}
                </div>
                <div>
                  USDC issuer {shortAddr(USDC_ISSUER_ACTIVE, 4)} · {NETWORK}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                style={{ marginTop: 10 }}
                onClick={() => (window.location.hash = "#/new")}
              >
                Start another circle
              </button>
            </Disclosure>

            {/* Rails belong to an account. Signed out there is nothing to show,
                so the row is absent rather than opening onto an apology. */}
            {pollar.address ? (
              <Disclosure
                title="Money in and out"
                summary="fund a seat, or cash out a round"
              >
                <CorridorPanel bare />
              </Disclosure>
            ) : null}

            <Disclosure
              title={pollar.address ? "Your wallet" : "Sign in"}
              summary={
                pollar.address
                  ? shortAddr(pollar.address, 4)
                  : pollar.hasKey
                    ? "email code · no seed phrase"
                    : "connect Pollar first"
              }
            >
              {pollar.hasKey ? <SignInPanel /> : <KeyForm />}
            </Disclosure>
          </div>
        </div>
      </div>

      {/* The one action that matters, thumb-height, on a phone only. */}
      {iAmContributor && !finished ? (
        <div className="mobile-cta">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={runPay}
            disabled={paying || pollar.txPending}
          >
            {paying || pollar.txPending ? <span className="spin" /> : <IconSend size={18} />}
            Pay {fmtUsdcDisplay(circle.amountUsdc)} USDC
          </button>
        </div>
      ) : null}
    </>
  );
}
