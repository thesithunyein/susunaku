import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lockup } from "./art";
import { GitHubMark, IconExternal, IconMenu } from "./icons";

export function TopBar({ pill, right }: { pill?: ReactNode; right?: ReactNode }) {
  return (
    <div className="topbar">
      <a className="brand" href="#/" aria-label="Susunaku home">
        <Lockup />
      </a>
      <div className="topbar-center">{pill}</div>
      <div className="topbar-right">{right}</div>
    </div>
  );
}

export function CountdownPill({ children }: { children: ReactNode }) {
  return <span className="countdown">{children}</span>;
}

export function Lcd({
  label,
  value,
  sub,
  size = "md",
}: {
  label: string;
  value: string;
  sub?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="lcd">
      <div className="lcd-label">{label}</div>
      <div className={size === "lg" ? "lcd-value lcd-value-lg" : "lcd-value"}>{value}</div>
      {sub ? <div className="lcd-sub">{sub}</div> : null}
    </div>
  );
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/**
 * One labeled control instead of a column of unlabeled glyphs.
 *
 * The old rail put seven icon-only buttons down the middle of the page — a
 * printer, a heart and a star among them — and then hid all seven below 1120px,
 * so the narrowest screens lost the most. A menu keeps every action on every
 * screen, and each one says what it does.
 */
export function TopBarMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <IconMenu size={17} />
        <span className="menu-trigger-label">Menu</span>
      </button>
      {open ? (
        <div className="menu-pop" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`menu-item ${item.danger ? "is-danger" : ""}`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon ? <span className="menu-icon">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 Susunaku</span>
      <span className="sep" />
      <select className="lang" defaultValue="en" aria-label="Language">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="pt">Português</option>
      </select>
      <span className="footer-links">
        <button type="button" onClick={() => (window.location.hash = "#/how")}>
          How it works
        </button>
        <button type="button" onClick={() => (window.location.hash = "#/setup")}>
          Network &amp; key
        </button>
        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noreferrer"
        >
          Explorer
          <IconExternal size={13} />
        </a>
      </span>
      <span className="footer-right">
        <a
          className="soc"
          href="https://github.com/thesithunyein/susunaku"
          target="_blank"
          rel="noreferrer"
          aria-label="Susunaku on GitHub"
          title="Susunaku on GitHub"
        >
          <GitHubMark size={17} />
        </a>
        <a
          className="soc-text"
          href="https://www.pollar.xyz/"
          target="_blank"
          rel="noreferrer"
        >
          Built on Pollar
          <IconExternal size={13} />
        </a>
      </span>
    </footer>
  );
}
