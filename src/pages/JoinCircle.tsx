import { useEffect, useState } from "react";
import { decodeCircle } from "../lib/share";
import { upsertCircle } from "../lib/store";

export function JoinCircle({ payload }: { payload: string }) {
  const [status, setStatus] = useState<"working" | "bad" | "done">("working");
  const [name, setName] = useState("");

  useEffect(() => {
    const circle = decodeCircle(payload);
    if (!circle) {
      setStatus("bad");
      return;
    }
    upsertCircle(circle);
    setName(circle.name);
    setStatus("done");
    const timer = window.setTimeout(() => {
      window.location.hash = `#/circle/${circle.id}`;
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [payload]);

  return (
    <div className="wrap" style={{ maxWidth: 560, textAlign: "center", paddingTop: 40 }}>
      {status === "working" ? <h1 className="display display-sm">Joining…</h1> : null}
      {status === "done" ? (
        <>
          <h1 className="display display-sm">You're in</h1>
          <p className="hero-sub">
            {name} is now on this device, along with its amount, cadence and rotation order.
            Opening the round…
          </p>
          <div className="note note-info">
            Nothing was registered anywhere. The circle travelled in the link, and the money
            only ever moves between members' own wallets.
          </div>
        </>
      ) : null}
      {status === "bad" ? (
        <>
          <h1 className="display display-sm">Bad link</h1>
          <p className="hero-sub">
            That invite link could not be read. Ask the organiser to copy it again.
          </p>
          <a className="btn btn-primary" href="#/">
            Back home
          </a>
        </>
      ) : null}
    </div>
  );
}
