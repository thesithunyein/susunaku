import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionRail, CountdownPill, Decor, Footer, TopBar, railIcons } from "./components/chrome";
import { SignInPanel } from "./components/AuthPanel";
import { Home } from "./pages/Home";
import { CreateCircle } from "./pages/CreateCircle";
import { JoinCircle } from "./pages/JoinCircle";
import { HowItWorks, Setup } from "./pages/Info";
import { currentRound, isComplete, roundWindow } from "./lib/circle";
import { NETWORK } from "./lib/config";
import { fmtCountdown, shortAddr } from "./lib/format";
import { usePollar } from "./lib/pollar";
import { useCircles } from "./lib/store";

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
  const [authOpen, setAuthOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const openAuth = useCallback(() => setAuthOpen(true), []);

  const activeCircle = useMemo(() => {
    if (route.name !== "home") return undefined;
    return route.circleId ? circles.find((c) => c.id === route.circleId) : circles[0];
  }, [route, circles]);

  const pill = useMemo(() => {
    if (!activeCircle) {
      return (
        <CountdownPill>
          <span className="cd-label">Circle</span> <strong>none yet</strong>
        </CountdownPill>
      );
    }
    const round = currentRound(activeCircle, now);
    const window_ = roundWindow(activeCircle, round);
    const left = Math.max(0, window_.end - now);
    const finished = isComplete(activeCircle, now);
    return (
      <CountdownPill>
        <span aria-hidden="true">⏳</span>
        <span className="cd-label">This Round Ends In:</span>{" "}
        <strong>{finished ? "closed" : fmtCountdown(left)}</strong>
      </CountdownPill>
    );
  }, [activeCircle, now]);

  const icons = railIcons();

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const rail = [
    { id: "members", title: "Round members", icon: icons.members, onClick: () => jump("members") },
    { id: "receipts", title: "Receipts", icon: icons.receipts, onClick: () => jump("receipts") },
    {
      id: "wallet",
      title: "Connect Pollar / wallet",
      icon: icons.bolt,
      onClick: openAuth,
    },
    {
      id: "new",
      title: "New circle",
      icon: icons.star,
      onClick: () => (window.location.hash = "#/new"),
    },
    {
      id: "how",
      title: "How it works",
      icon: icons.heart,
      onClick: () => (window.location.hash = "#/how"),
    },
    {
      id: "setup",
      title: "Network & key",
      icon: icons.printer,
      onClick: () => (window.location.hash = "#/setup"),
    },
    {
      id: "balance",
      title: "Refresh balance",
      icon: icons.coin,
      onClick: () => pollar.refreshBalance(),
    },
  ];

  return (
    <div className="shell">
      <Decor />
      <ActionRail
        actions={rail.map((action) => ({
          ...action,
          current: route.name === action.id,
        }))}
      />

      <div className="wrap">
        <TopBar
          pill={pill}
          right={
            <>
              <span className="countdown">
                <span className="cd-label">Stellar</span>{" "}
                <strong>{NETWORK === "mainnet" ? "mainnet" : "testnet"}</strong>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={openAuth}
                title={pollar.address ?? "Sign in"}
              >
                {pollar.address ? `👤 ${shortAddr(pollar.address)}` : "👤 Sign in"}
              </button>
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
          aria-label="Sign in"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAuthOpen(false);
          }}
        >
          <div className="modal">
            <div className="card-head">
              <span className="card-title">Your wallet, in one tap</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAuthOpen(false)}
              >
                Close
              </button>
            </div>
            <SignInPanel />
            <p className="tiny muted" style={{ marginBottom: 0 }}>
              No seed phrase, no browser extension and no gas: Pollar creates a Stellar wallet
              for you and covers the network fee.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
