import type { ReactNode } from "react";
import { Lockup, Coin, Blob, StarCoin, Bolt, Heart, Printer, GridIcon } from "./art";

export function TopBar({
  pill,
  right,
}: {
  pill?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="topbar">
      <a className="brand" href="#/" aria-label="Susunaku home">
        <Lockup />
      </a>
      <div>{pill}</div>
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

export interface RailAction {
  id: string;
  title: string;
  icon: ReactNode;
  onClick: () => void;
  current?: boolean;
}

export function ActionRail({ actions }: { actions: RailAction[] }) {
  return (
    <nav className="rail" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="rail-btn"
          title={action.title}
          aria-label={action.title}
          aria-current={action.current ? "true" : undefined}
          onClick={action.onClick}
        >
          {action.icon}
        </button>
      ))}
    </nav>
  );
}

export function railIcons() {
  return {
    members: <Blob size={24} color="#2FA84F" />,
    receipts: <GridIcon size={24} />,
    coin: <Coin size={22} />,
    star: <StarCoin size={24} />,
    heart: <Heart size={22} />,
    bolt: <Bolt size={22} />,
    printer: <Printer size={24} />,
  };
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
          Connect Pollar
        </button>
        <a
          className="footer-links"
          href="https://stellar.expert/explorer/public"
          target="_blank"
          rel="noreferrer"
        >
          Explorer
        </a>
      </span>
      <span className="footer-right">
        <a className="soc" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
          🐙
        </a>
        <a
          className="soc"
          href="https://www.pollar.xyz/"
          target="_blank"
          rel="noreferrer"
          aria-label="Pollar"
        >
          🐻‍❄️
        </a>
      </span>
    </footer>
  );
}

export function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <span style={{ top: "15%", left: "3.5%", ["--rot" as string]: "-8deg" }}>
        <Printer size={46} />
      </span>
      <span style={{ top: "29%", left: "7%", ["--rot" as string]: "6deg" }}>
        <Coin size={38} />
      </span>
      <span style={{ top: "43%", left: "3%", ["--rot" as string]: "10deg", animationDelay: "0.6s" }}>
        <StarCoin size={48} />
      </span>
      <span style={{ top: "14%", right: "4%", ["--rot" as string]: "-6deg" }}>
        <Blob size={42} color="#2FA84F" />
      </span>
      <span style={{ top: "27%", right: "8%", ["--rot" as string]: "8deg", animationDelay: "1.1s" }}>
        <Coin size={40} />
      </span>
      <span style={{ top: "37%", right: "3.5%", ["--rot" as string]: "-12deg", animationDelay: "0.3s" }}>
        <Bolt size={40} />
      </span>
      <span style={{ top: "50%", right: "6%", ["--rot" as string]: "10deg", animationDelay: "1.5s" }}>
        <Heart size={38} />
      </span>
      <span style={{ top: "58%", left: "4%", ["--rot" as string]: "12deg", animationDelay: "0.9s" }}>
        <GridIcon size={40} />
      </span>
    </div>
  );
}
