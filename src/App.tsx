import { useCallback, useEffect, useMemo, useState } from "react";
import { CountdownPill, Footer, TopBar, TopBarMenu, type MenuItem } from "./components/chrome";
import { SignInPanel } from "./components/AuthPanel";
import { Home } from "./pages/Home";
import { CreateCircle } from "./pages/CreateCircle";
import { JoinCircle } from "./pages/JoinCircle";
import { HowItWorks, Setup } from "./pages/Info";
import { IconBook, IconClose, IconClock, IconKey, IconPlus, IconRefresh, IconUser } from "./components/icons";
import { currentRound, isComplete, roundWindow } from "./lib/circle";
import { NETWORK } from "./lib/config";
import { fmtCountdown, shortAddr } from "./lib/format";
import { usePollar } from "./lib/pollar";
import { useCircles } from "./lib/store";
import { useLang, LANG_OPTIONS } from "./lib/i18n";

type Route =
  | { name: "home"; circleId?: string }
  | { name: "new" }
  | { name: "join"; payload: string }
  | { name: "how" }
  | { name: "setup" };

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query ?? "");

  if (path.startsWith("circle/")) return { name: "home", circleId: path.slice("circle/".length) };
  if (path === "new") return { name: "new" };
  if (path === "join") return { name: "join", payload: params.get("c") ?? "" };
  if (path === "how") return { name: "how" };
  if (path === "setup") return { name: "setup" };
  return { name: "home" };
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const circles = useCircles();
  const pollar = usePollar();
  const { t, lang, setLang } = useLang();
  const [authOpen, setAuthOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // The tab title carries the pitch; it follows the language like everything else.
  useEffect(() => {
    document.title = `Susunaku — ${t("tagline.suffix")}`;
  }, [t]);

  const openAuth = useCallback(() => setAuthOpen(true), []);

  // Close the sheet on Escape, like every other modal.
  useEffect(() => {
    if (!authOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [authOpen]);

  const activeCircle = useMemo(() => {
    if (route.name !== "home") return undefined;
    // An explicit circle in the URL is an invite: show its clock even signed out.
    if (route.circleId) return circles.find((c) => c.id === route.circleId);
    // Signed out, the page is an empty state — a stored circle's clock would be
    // a timer for something the visitor cannot see or act on.
    if (!pollar.address) return undefined;
    return circles[0];
  }, [route, circles, pollar.address]);

  const pill = useMemo(() => {
    // No circle means no clock. A "none yet" pill is chrome for a thing that
    // does not exist, and the empty page says that better on its own.
    if (!activeCircle) return null;
    const round = currentRound(activeCircle, now);
    const window_ = roundWindow(activeCircle, round);
    const left = Math.max(0, window_.end - now);
    const finished = isComplete(activeCircle, now);
    return (
      <CountdownPill>
        <IconClock size={14} />
        <span className="cd-label">Ends in</span>{" "}
        <strong>{finished ? "closed" : fmtCountdown(left)}</strong>
      </CountdownPill>
    );
  }, [activeCircle, now]);

  const menu: MenuItem[] = [
    {
      id: "new",
      label: t("action.new"),
      icon: <IconPlus size={16} />,
      onClick: () => (window.location.hash = "#/new"),
    },
    {
      id: "how",
      label: t("action.how"),
      icon: <IconBook size={16} />,
      onClick: () => (window.location.hash = "#/how"),
    },
    {
      id: "setup",
      label: t("footer.setup"),
      icon: <IconKey size={16} />,
      onClick: () => (window.location.hash = "#/setup"),
    },
  ];
  if (pollar.hasKey) {
    menu.push({
      id: "balance",
      label: t("action.refreshBalance"),
      icon: <IconRefresh size={16} />,
      onClick: () => pollar.refreshBalance(),
    });
  }
  if (pollar.address) {
    menu.push({
      id: "signout",
      label: t("action.signOut"),
      icon: <IconUser size={16} />,
      danger: true,
      onClick: () => pollar.signOut(),
    });
  }

  return (
    <div className="shell">
      <div className="wrap">
        <TopBar
          pill={pill}
          right={
            <>
              <span className="countdown network-chip">
                <span className="cd-label">Stellar</span>{" "}
                <strong>{NETWORK === "mainnet" ? "mainnet" : "testnet"}</strong>
              </span>
              <select
                className="lang lang-chip"
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof LANG_OPTIONS[number]["value"])}
                aria-label="Language"
              >
                {LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm account-btn"
                onClick={openAuth}
                title={pollar.address ?? "Sign in"}
              >
                <IconUser size={16} />
                <span className="account-label">
                  {pollar.address ? shortAddr(pollar.address, 3) : "Sign in"}
                </span>
              </button>
              <TopBarMenu items={menu} />
            </>
          }
        />
      </div>

      {route.name === "home" ? (
        <Home circleId={route.circleId} openAuth={openAuth} />
      ) : null}
      {route.name === "new" ? <CreateCircle /> : null}
      {route.name === "join" ? <JoinCircle payload={route.payload} /> : null}
      {route.name === "how" ? <HowItWorks /> : null}
      {route.name === "setup" ? <Setup /> : null}

      <Footer />

      {authOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={pollar.address ? "Your wallet" : "Sign in"}
          onClick={(event) => {
            if (event.target === event.currentTarget) setAuthOpen(false);
          }}
        >
          <div className="modal">
            <div className="card-head">
              <span className="card-title">{pollar.address ? "Your wallet" : "Sign in"}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm icon-btn"
                onClick={() => setAuthOpen(false)}
                aria-label="Close"
              >
                <IconClose size={16} />
              </button>
            </div>
            <SignInPanel />
            <p className="tiny muted" style={{ marginBottom: 0 }}>
              The wallet is created on first sign-in and stays yours. No seed phrase, no extension.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
