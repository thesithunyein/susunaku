import { useEffect, useState } from "react";
import { usePollar, type RampQuoteView } from "../lib/pollar";
import {
  AFRICAN_GAP,
  AFRICAN_LEGS,
  CORRIDOR_IN_ONE_LINE,
  LATAM_LEGS,
  type CorridorLeg,
} from "../lib/corridor";
import { Disclosure } from "./Disclosure";
import { fmtUsdcDisplay } from "../lib/format";
import { NETWORK } from "../lib/config";
import { IconCheck, IconCopy, IconSpark } from "./icons";

/**
 * A member's rails, not the operator's dashboard.
 *
 * Everything shown here is either read live from Pollar or explicitly labelled
 * "designed". We never render a corridor the backend cannot execute, because a
 * member who is offered a route that then fails has been lied to — and the
 * African leg genuinely does not exist in the SDK yet, which the panel says out
 * loud rather than papering over.
 */
function LegRow({ leg }: { leg: CorridorLeg }) {
  const live = leg.status === "live";
  const direction =
    leg.direction === "both" ? "money in and out" : leg.direction === "in" ? "money in" : "money out";
  return (
    <div className="member">
      {/* The fiat code, not a flag: flag emoji do not render at all on Windows. */}
      <div
        className="member-avatar"
        style={{ background: live ? "var(--green)" : "var(--muted-2)" }}
      >
        {leg.fiat.split("·")[0].trim().slice(0, 3).toUpperCase()}
      </div>
      <div>
        <div className="member-name">
          {leg.country} · {leg.fiat}
          <span className={`chip ${live ? "chip-paid" : "chip-due"}`}>
            {live ? "live" : "designed"}
          </span>
        </div>
        <div className="member-meta">
          {leg.rail} · {leg.provider} · {direction}
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          {leg.note}
        </div>
      </div>
    </div>
  );
}

export function CorridorPanel({ bare = false }: { bare?: boolean } = {}) {
  const {
    address,
    balanceUsdc,
    xlmBalance,
    rampCorridors,
    rampCorridorsStatus,
    rampCorridorsMessage,
    loadRampCorridors,
    quoteRamp,
  } = usePollar();

  const [amount, setAmount] = useState("10");
  const [quotes, setQuotes] = useState<RampQuoteView[] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [copied, setCopied] = useState(false);

  // The corridor list is session-scoped, so it is only worth asking for once a
  // wallet exists.
  useEffect(() => {
    if (address) loadRampCorridors();
  }, [address, loadRampCorridors]);

  // Never hand a caller an empty panel: a disclosure that opens onto nothing
  // reads as a bug. Say what is missing and what would show it.
  if (!address) {
    const empty = (
      <p className="tiny muted" style={{ margin: 0 }}>
        Sign in to see where your money can come in and out.
      </p>
    );
    return bare ? (
      empty
    ) : (
      <div className="card">
        <div className="card-head">
          <span className="card-title">Money in and out</span>
        </div>
        {empty}
      </div>
    );
  }

  const corridor = rampCorridors?.[0];
  const amountNumber = Number(amount);

  const runQuote = async (direction: "onramp" | "offramp") => {
    if (!corridor) return;
    setQuoting(true);
    setQuoteError(null);
    setQuotes(null);
    try {
      const list = await quoteRamp({
        country: corridor.code,
        currency: corridor.currency ?? "USD",
        amount: Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 10,
        direction,
      });
      setQuotes(list);
      if (list.length === 0) {
        setQuoteError("No provider returned a quote for that corridor and amount.");
      }
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Could not get a quote.");
    } finally {
      setQuoting(false);
    }
  };

  const recheck = (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={loadRampCorridors}
      disabled={rampCorridorsStatus === "loading"}
    >
      {rampCorridorsStatus === "loading" ? "Checking…" : "Re-check corridors"}
    </button>
  );

  // `bare` gives the same content without its own card, so a parent can fold it
  // into a disclosure rather than nesting a card inside a card.
  const content = (
    <>
      {bare ? <div className="section-actions">{recheck}</div> : null}
      <div className="note note-info tiny">{CORRIDOR_IN_ONE_LINE}</div>

      <div className="field">
        <label htmlFor="corridor-address">Your address — anything can pay it</label>
        <input
          id="corridor-address"
          readOnly
          value={address}
          onFocus={(event) => event.currentTarget.select()}
        />
        <span className="hint">
          USDC {fmtUsdcDisplay(balanceUsdc)} · XLM {xlmBalance ?? "—"} on {NETWORK}. The trustline
          is open, so any bank, exchange or ramp can send here.
        </span>
      </div>
      <div className="cta-row" style={{ flexDirection: "row", gap: 10 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(address).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              },
              () => setCopied(false)
            );
          }}
        >
          {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
          {copied ? "Address copied" : "Copy my address"}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="card-title">Corridors this app can execute</div>
        {rampCorridorsStatus === "loading" ? (
          <p className="tiny muted">Checking which corridors this app can use…</p>
        ) : rampCorridorsStatus === "error" ? (
          <div className="note note-warn tiny">
            Could not read this app's corridors ({rampCorridorsMessage}). The routes below are what
            Pollar supports — none invented.
          </div>
        ) : rampCorridors && rampCorridors.length > 0 ? (
          <>
            {rampCorridorsMessage ? (
              <div className="note note-info tiny">{rampCorridorsMessage}</div>
            ) : null}
            <p className="tiny muted">
              Live for this app:{" "}
              {rampCorridors
                .map((entry) => `${entry.code}${entry.currency ? ` (${entry.currency})` : ""}`)
                .join(" · ")}
            </p>
            <div className="row">
              <div className="field">
                <label htmlFor="ramp-amount">Amount</label>
                <input
                  id="ramp-amount"
                  value={amount}
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <div className="cta-row" style={{ flexDirection: "row", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void runQuote("onramp")}
                    disabled={quoting}
                  >
                    {quoting ? "Quoting…" : "Quote money in"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void runQuote("offramp")}
                    disabled={quoting}
                  >
                    {quoting ? "Quoting…" : "Quote cash out"}
                  </button>
                </div>
              </div>
            </div>
            {quoteError ? <div className="note note-warn tiny">{quoteError}</div> : null}
            {quotes && quotes.length > 0 ? (
              <div className="stack" style={{ marginTop: 10 }}>
                {quotes.map((quote) => (
                  <div className="member" key={quote.quoteId}>
                    <div
                      className="member-avatar"
                      style={{ background: quote.recommended ? "var(--yellow-dark)" : "var(--muted-2)" }}
                    >
                      {quote.recommended ? <IconSpark size={16} /> : "·"}
                    </div>
                    <div>
                      <div className="member-name">
                        {quote.provider}
                        {quote.recommended ? <span className="chip chip-paid">best</span> : null}
                      </div>
                      <div className="member-meta">
                        {quote.rail || quote.protocol}
                        {quote.rate !== null ? ` · rate ${quote.rate}` : ""}
                        {quote.fee !== null ? ` · fee ${quote.fee} ${quote.feeCurrency ?? ""}` : ""}
                        {quote.estimatedTime ? ` · ${quote.estimatedTime}` : ""}
                      </div>
                      <div className="tiny muted">
                        {quote.minAmount !== null || quote.maxAmount !== null
                          ? `Limits ${quote.minAmount ?? "—"} – ${quote.maxAmount ?? "—"} · quote ${quote.quoteId}`
                          : `quote ${quote.quoteId}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="note note-warn tiny">
            <strong>No corridor is enabled for this app yet.</strong> Turn one on in Dashboard →
            Integrations → Ramps and this fills itself in, no code change.
          </div>
        )}
      </div>

      {/* Nine legs is research, not an action. Nested so opening this panel does
          not dump a wall of routes between a member and their next payment. */}
      <div style={{ marginTop: 18 }}>
        <Disclosure
          className="section-nested"
          title="Latin America · the operating legs"
          summary={`${LATAM_LEGS.length} providers · Pollar runs this side`}
        >
          <div className="members">
            {LATAM_LEGS.map((leg) => (
              <LegRow key={leg.id} leg={leg} />
            ))}
          </div>
        </Disclosure>
      </div>

      <div style={{ marginTop: 10 }}>
        <Disclosure
          className="section-nested"
          title="Africa · the leg that has to be built"
          summary={`${AFRICAN_LEGS.length} candidate rails · designed, not wired`}
        >
          <div className="note note-warn tiny">{AFRICAN_GAP}</div>
          <div className="members">
            {AFRICAN_LEGS.map((leg) => (
              <LegRow key={leg.id} leg={leg} />
            ))}
          </div>
        </Disclosure>
      </div>

      <p className="tiny muted" style={{ marginTop: 14, marginBottom: 0 }}>
        Pollar sponsors the wallet and its trustlines. Payment fees come from a member's own XLM
        unless the operator turns on payment sponsorship in Dashboard → Treasury → Sponsorship.
      </p>
    </>
  );

  if (bare) return content;

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Money in and out</span>
        {recheck}
      </div>
      {content}
    </div>
  );
}
