import { useState, type ReactNode } from "react";
import { IconChevron } from "./icons";

/**
 * Show the answer, hide the explanation.
 *
 * A member opening a circle wants three things: what the round is, who receives
 * it, and how to pay. Everything else — the member list, the receipts, the
 * rails, the reasoning — is one tap away rather than stacked in the way. The
 * collapsed row still carries a summary, so nothing important is invisible.
 */
export function Disclosure({
  title,
  summary,
  children,
  defaultOpen = false,
  id,
  className,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`card section ${className ?? ""}`} id={id}>
      <button
        type="button"
        className="section-head"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="section-labels">
          <span className="card-title">{title}</span>
          {summary ? <span className="section-summary">{summary}</span> : null}
        </span>
        <IconChevron size={18} className={`section-chevron ${open ? "is-open" : ""}`} />
      </button>
      {open ? <div className="section-body">{children}</div> : null}
    </section>
  );
}
