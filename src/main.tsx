import { createRoot } from "react-dom/client";
import App from "./App";
import { PollarGateway } from "./lib/pollar";
import { LangProvider } from "./lib/i18n";
import "./styles/tokens.css";
import "./styles/app.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

// No StrictMode on purpose: it double-mounts effects, and @pollar/core holds a
// live session and DPoP keypair per client. One client per page is correct.
createRoot(container).render(
  <PollarGateway>
    <LangProvider>
      <App />
    </LangProvider>
  </PollarGateway>
);
