import { useMemo, useState } from "react";
import {
  CADENCE_LABEL,
  isStellarAddress,
  newCircleId,
  newMemberId,
  normalizeAddress,
  roundValue,
  type Cadence,
  type Circle,
  type Member,
} from "../lib/circle";
import { NETWORK } from "../lib/config";
import { fmtUsdcDisplay, shortAddr } from "../lib/format";
import { usePollar } from "../lib/pollar";
import { circleShareUrl } from "../lib/share";
import { upsertCircle } from "../lib/store";
import { IconPlus } from "../components/icons";
import { Disclosure } from "../components/Disclosure";
import { KeyForm, SignInPanel } from "../components/AuthPanel";

interface DraftMember {
  key: string;
  name: string;
  country: string;
  address: string;
}

function emptyDraft(): DraftMember {
  return { key: newMemberId(), name: "", country: "", address: "" };
}

function NewCircleForm() {
  const { address, hasKey } = usePollar();
  const [name, setName] = useState("Family circle");
  const [amount, setAmount] = useState("10");
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [members, setMembers] = useState<DraftMember[]>(() => [
    { key: newMemberId(), name: "You", country: "", address: address ?? "" },
    emptyDraft(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Circle | null>(null);

  const amountNumber = Number(amount);

  const preview = useMemo(() => {
    const count = members.length;
    const round = amountNumber * Math.max(0, count - 1);
    return {
      round,
      lifetime: amountNumber * count * Math.max(0, count - 1),
      perYear: (count - 1) * (cadence === "daily" ? 365 : cadence === "weekly" ? 52 : 12),
    };
  }, [amountNumber, members.length, cadence]);

  const update = (key: string, patch: Partial<DraftMember>) => {
    setMembers((current) =>
      current.map((m) => (m.key === key ? { ...m, ...patch } : m))
    );
  };

  const submit = () => {
    setError(null);
    const clean: DraftMember[] = members
      .map((m) => ({
        ...m,
        name: m.name.trim(),
        country: m.country.trim(),
        address: normalizeAddress(m.address),
      }))
      .filter((m) => m.name || m.address);

    if (clean.length < 2) {
      setError("A circle needs at least two members.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Choose a contribution amount above zero.");
      return;
    }
    for (const m of clean) {
      if (!m.name) {
        setError("Every member needs a name.");
        return;
      }
      if (!isStellarAddress(m.address)) {
        setError(`"${m.name}" needs a valid Stellar address starting with G.`);
        return;
      }
    }
    const unique = new Set(clean.map((m) => m.address));
    if (unique.size !== clean.length) {
      setError("Two members cannot share the same wallet address.");
      return;
    }

    const built: Member[] = clean.map((m) => ({
      id: m.key,
      name: m.name,
      country: m.country,
      address: m.address,
      isMe: Boolean(address && m.address === normalizeAddress(address)),
    }));

    const circle: Circle = {
      id: newCircleId(),
      name: name.trim() || "Savings circle",
      amountUsdc: amountNumber,
      cadence,
      members: built,
      order: built.map((m) => m.id),
      createdAt: Date.now(),
      startAt: Date.now(),
      network: NETWORK,
    };

    upsertCircle(circle);
    setCreated(circle);
  };

  if (created) {
    const url = circleShareUrl(created);
    return (
      <div className="wrap" style={{ maxWidth: 720 }}>
        <h1 className="display display-sm">Circle live</h1>
        <p className="hero-sub">
          {created.name} · {created.members.length} members ·{" "}
          {fmtUsdcDisplay(created.amountUsdc)} USDC {CADENCE_LABEL[created.cadence]}
        </p>
        <div className="card stack">
          <div className="note note-good">
            Round 1 pays <strong>{created.members[0].name}</strong>{" "}
            {fmtUsdcDisplay(roundValue(created, 0))} USDC. Send everyone the link below.
          </div>
          <div className="field">
            <label htmlFor="invite">Invite link</label>
            <input id="invite" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <span className="hint">
              The whole circle travels in this link. No sign-up to view it.
            </span>
          </div>
          <div className="cta-row" style={{ flexDirection: "row", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void navigator.clipboard?.writeText(url)}
            >
              Copy link
            </button>
            <a className="btn btn-ghost" href={`#/circle/${created.id}`}>
              Open the round
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 780 }}>
      <h1 className="display display-sm">New circle</h1>
      <p className="hero-sub">Set an amount, a cadence, and who receives each round.</p>

      <div className="card stack">
        <div className="row">
          <div className="field">
            <label htmlFor="cname">Circle name</label>
            <input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Market women of Kumasi"
            />
          </div>
          <div className="field">
            <label htmlFor="camount">Contribution per round (USDC)</label>
            <input
              id="camount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="10"
            />
          </div>
          <div className="field">
            <label htmlFor="ccadence">Cadence</label>
            <select
              id="ccadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
            >
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
            <span className="hint">Daily is how collectors work.</span>
          </div>
        </div>

        <div className="card-head" style={{ marginBottom: 0 }}>
          <span className="card-title">Members, in the order they receive</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMembers((current) => [...current, emptyDraft()])}
          >
            + Add member
          </button>
        </div>

        <div className="stack">
          {members.map((member, index) => (
            <div className="row" key={member.key}>
              <div className="field">
                <label>Member {index + 1} · name</label>
                <input
                  value={member.name}
                  onChange={(e) => update(member.key, { name: e.target.value })}
                  placeholder={index === 0 ? "You" : "Aunt Ama"}
                />
              </div>
              <div className="field">
                <label>Country</label>
                <input
                  value={member.country}
                  onChange={(e) => update(member.key, { country: e.target.value })}
                  placeholder="Ghana"
                />
              </div>
              <div className="field">
                <label>Stellar wallet address</label>
                <input
                  value={member.address}
                  onChange={(e) => update(member.key, { address: e.target.value })}
                  placeholder="G…"
                  spellCheck={false}
                />
                <span
                  className={
                    member.address && !isStellarAddress(member.address) ? "hint hint-bad" : "hint"
                  }
                >
                  {member.address
                    ? isStellarAddress(member.address)
                      ? `Looks valid · ${shortAddr(normalizeAddress(member.address), 6)}`
                      : "A Stellar address is 56 characters and starts with G."
                    : "From their wallet."}
                </span>
              </div>
              {members.length > 2 ? (
                <div className="field">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setMembers((current) => current.filter((m) => m.key !== member.key))
                    }
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* The numbers matter, but they should not stand between the form and
            the button. Collapsed, they are one line; opened, the full LCDs. */}
        <Disclosure
          title="What this circle moves"
          summary={`$${fmtUsdcDisplay(preview.round)} a round · $${fmtUsdcDisplay(
            preview.lifetime
          )} over ${members.length} rounds`}
        >
          <div className="grid-3">
            <div className="lcd">
              <div className="lcd-label">Round payout</div>
              <div className="lcd-value">${fmtUsdcDisplay(preview.round)}</div>
            </div>
            <div className="lcd">
              <div className="lcd-label">Moved over {members.length} rounds</div>
              <div className="lcd-value">${fmtUsdcDisplay(preview.lifetime)}</div>
            </div>
            <div className="lcd">
              <div className="lcd-label">Payments / member / year</div>
              <div className="lcd-value">{preview.perYear}</div>
              <div className="lcd-sub">At this cadence — that is the volume Pollar earns on.</div>
            </div>
          </div>
        </Disclosure>

        {error ? <div className="note note-bad">{error}</div> : null}
        {!hasKey ? (
          <div className="note note-warn">
            No key connected. You can still create the circle — payments need a key, added under
            Network &amp; key in the menu.
          </div>
        ) : null}

        <button type="button" className="btn btn-primary btn-block" onClick={submit}>
          <IconPlus size={18} /> Create the circle
        </button>
      </div>
    </div>
  );
}

/**
 * A circle is built out of the creator's own wallet address, so it needs an
 * account before it needs a form. Signed out this page is a sign-in rather than
 * a form that cannot be submitted, and the signed-in branch is the only one
 * that mounts the fields.
 */
export function CreateCircle() {
  const { address, hasKey } = usePollar();

  if (!address) {
    return (
      <div className="wrap" style={{ maxWidth: 560 }}>
        <h1 className="display display-sm">Start a circle</h1>
        <p className="hero-sub">
          A circle is built from your wallet address, so this needs an account first. One email
          code, no password — Pollar creates the wallet.
        </p>
        <div className="card">{hasKey ? <SignInPanel /> : <KeyForm />}</div>
        <p className="tiny muted" style={{ marginTop: 14 }}>
          Invited to a circle? That link needs no account — open it and the round shows.
        </p>
      </div>
    );
  }

  return <NewCircleForm />;
}
