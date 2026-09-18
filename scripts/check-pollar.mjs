#!/usr/bin/env node
/**
 * check-pollar.mjs — asks Pollar's live API two questions and prints the exact
 * verdict for each, so neither is a guess:
 *
 *   1. Does the API accept requests coming from this app's origin?  (CORS preflight)
 *   2. Does the API accept the publishable key from that origin?    (the call the SDK makes)
 *
 * Usage:
 *   node scripts/check-pollar.mjs pub_testnet_xxxxxxxx
 *   POLLAR_PUBLISHABLE_KEY=pub_testnet_xxxxxxxx npm run pollar:check
 *
 * Env overrides: POLLAR_API_BASE, POLLAR_ORIGIN
 *
 * Exit codes: 0 accepted · 1 rejected · 2 no key supplied
 */

const API = process.env.POLLAR_API_BASE || "https://sdk.api.pollar.xyz";
const ORIGIN = process.env.POLLAR_ORIGIN || "https://susunaku.sithunyein.com";

/** A domain deliberately not configured in the Pollar dashboard, used as a control. */
const CONTROL_ORIGIN = "https://not-a-configured-domain.invalid";

/** The endpoints @pollar/core itself calls. The SDK uses the /v2 surface. */
const CONFIG_PATH = "/v2/applications/config";
const SESSION_PATH = "/v2/auth/session";

/**
 * Local dev origins. Pollar enforces an origin allowlist, so a localhost origin
 * only works once it is listed in Dashboard → Build → Domains.
 */
const DEV_ORIGINS = ["http://localhost:5187", "http://localhost:5199"];

const key = (
  process.argv[2] ||
  process.env.POLLAR_PUBLISHABLE_KEY ||
  process.env.VITE_POLLAR_PUBLISHABLE_KEY ||
  ""
).trim();

const mask = (k) => (k.length <= 16 ? k : `${k.slice(0, 12)}…${k.slice(-4)}`);

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const rule = (t) => console.log(`\n${bold(t)}\n${"─".repeat(t.length)}`);

async function req(path, { method = "GET", origin = ORIGIN, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(key ? { "x-pollar-api-key": key } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body (usually an HTML error page from an edge) */
  }
  return { status: res.status, text: text.slice(0, 400), json };
}

const verdictOf = (r) => {
  const code = r.json?.code;
  if (r.status === 200) return { ok: true, why: "key accepted" };
  if (code === "API_KEY_NOT_FOUND")
    return { ok: false, why: "the API does not recognise this key at all" };
  if (code === "API_KEY_TYPE_NOT_ALLOWED")
    return {
      ok: false,
      why: "the key is real but of a type the client API refuses (a pat_/sec_ token, not a pub_ key)",
    };
  if (/ORIGIN|DOMAIN/.test(String(code)))
    return { ok: false, why: `the API rejected this origin (${code})` };
  return { ok: false, why: `rejected with ${code ?? `HTTP ${r.status}`}` };
};

console.log(bold("Pollar verification"));
console.log(dim(`  api     ${API}`));
console.log(dim(`  origin  ${ORIGIN}`));
console.log(dim(`  key     ${key ? mask(key) : "(none supplied)"}`));

let worstExit = 0;

// ── 1. Is the origin allowed to talk to the API at all? ──────────────────────
rule("1 · CORS preflight from this origin");
try {
  const pre = await req("/v1/auth/session", {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-pollar-api-key",
    },
  });
  const allow = pre.status === 204 || pre.status === 200;
  console.log(`  ${allow ? green("PASS") : red("FAIL")}  HTTP ${pre.status}`);
  console.log(dim(`  preflight is answered, so the network path from ${ORIGIN} works`));
} catch (err) {
  console.log(`  ${red("FAIL")}  ${err.message}`);
  worstExit = 1;
}

// ── 2. Does the API accept the key from this origin? ─────────────────────────
rule(`2 · GET ${CONFIG_PATH} — the call the SDK makes`);
if (!key) {
  console.log(`  ${red("SKIPPED")}  no key supplied`);
  console.log(dim("  pass one:  node scripts/check-pollar.mjs pub_testnet_xxxxxxxx"));
  worstExit = 2;
} else {
  const r = await req(CONFIG_PATH);
  const v = verdictOf(r);
  console.log(`  ${v.ok ? green("PASS") : red("FAIL")}  HTTP ${r.status}`);
  console.log(`  exact response: ${r.text || "(empty body)"}`);

  // A control origin tells us whether origin is what the server is judging.
  const control = await req(CONFIG_PATH, { origin: CONTROL_ORIGIN });
  const sameVerdict = control.status === r.status && control.text === r.text;
  console.log(
    `  ${dim(`same result from an unconfigured origin: ${sameVerdict ? "yes" : "no"}`)}`
  );
  console.log(
    dim(
      sameVerdict
        ? "  → this endpoint is gating on the key, not the origin; configure the domain anyway"
        : "  → the server is treating the two origins differently, so origin IS being enforced"
    )
  );

  if (!v.ok) {
    console.log(`  ${red("verdict:")} ${v.why}`);
    worstExit = 1;
  } else {
    console.log(`  ${green("verdict:")} ${v.why}`);
  }
}

// ── 3. Can this origin actually start a sign-in? ─────────────────────────────
rule(`3 · POST ${SESSION_PATH} — starting a real sign-in`);
if (!key) {
  console.log(`  ${dim("SKIPPED")}  needs a key`);
} else {
  const s = await req(SESSION_PATH, { method: "POST", body: {} });
  const created = s.json?.code === "SDK_SESSION_CREATED";
  console.log(`  ${created ? green("PASS") : red("FAIL")}  HTTP ${s.status}`);
  console.log(`  exact response: ${s.text || "(empty body)"}`);
  if (!created) worstExit = 1;
}

// ── 4. Will local dev work? ──────────────────────────────────────────────────
rule("4 · Local dev origins (expect FAIL until you allowlist one)");
if (!key) {
  console.log(`  ${dim("SKIPPED")}  needs a key`);
} else {
  for (const o of DEV_ORIGINS) {
    const r = await req(CONFIG_PATH, { origin: o });
    const ok = r.status === 200;
    console.log(`  ${ok ? green("allowlisted") : red("not allowed")}  ${o}`);
  }
  console.log(
    dim("  → add one in Dashboard → Build → Domains, or just test on the live domain")
  );
}

rule("What to do with this");
console.log(`
  · A pub_ key comes from dashboard.pollar.xyz → Build → API Keys → Generate.
  · Mainnet needs its own app:  Build → API Keys + Build → Domains.
  · Domains are configured at Dashboard → Build → Domains, and per Pollar's
    Mainnet Checklist there is no approval step — you verify it yourself.
  · Bake the key in:  vercel env add VITE_POLLAR_PUBLISHABLE_KEY production
`);

process.exit(worstExit);
