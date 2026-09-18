#!/usr/bin/env node
/**
 * Verify a Susunaku payment leg on Stellar Horizon — from the ledger, not the app.
 *
 *   node scripts/verify-leg.mjs <sender> <recipient> [minAmount]
 *
 * The app's toast says "Paid 1 USDC". This says whether that is true: it finds the
 * actual payment from sender to recipient, checks the asset and its issuer, reads the
 * memo off the transaction, and reconciles the recipient's USDC balance against the
 * USDC it has received. Exit code 0 only when a matching payment exists AND the
 * recipient's balance accounts for it.
 */

const HORIZON = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

/** Circle's testnet USDC issuer — the asset Susunaku settles in. */
const USDC_ISSUER =
  process.env.USDC_ISSUER ?? "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const [senderArg, recipientArg, minArg] = process.argv.slice(2);
const minAmount = Number(minArg ?? "0");

if (!senderArg || !recipientArg) {
  console.error("usage: node scripts/verify-leg.mjs <sender> <recipient> [minAmount]");
  process.exit(2);
}

const sender = senderArg.trim().toUpperCase();
const recipient = recipientArg.trim().toUpperCase();

const short = (id) => (id ? `${id.slice(0, 8)}…${id.slice(-6)}` : "—");
const usdc = (b) => (b === null || b === undefined ? "—" : Number(b).toFixed(7));

let failures = 0;
const pass = (n, msg) => console.log(`\n${n} · ${msg}\n  PASS`);
const fail = (n, msg, detail) => {
  failures += 1;
  console.log(`\n${n} · ${msg}\n  FAIL${detail ? `\n  ${detail}` : ""}`);
};

async function get(path) {
  const res = await fetch(`${HORIZON}${path}`);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function usdcBalance(account) {
  for (const b of account?.balances ?? []) {
    if ((b.asset_code ?? "").toUpperCase() !== "USDC") continue;
    if ((b.asset_issuer ?? "").toUpperCase() !== USDC_ISSUER) continue;
    return { balance: b.balance, authorized: Boolean(b.is_authorized) };
  }
  return null;
}

function xlmBalance(account) {
  for (const b of account?.balances ?? []) {
    if (b.asset_type === "native") return b.balance;
  }
  return null;
}

const recordsOf = (page) => page?.body?._embedded?.records ?? [];

/** Both plain payments and path payments can credit the recipient. */
const isCredit = (r) =>
  r?.type === "payment" || r?.type === "path_payment_strict_send" || r?.type === "path_payment_strict_receive";

async function main() {
  console.log("=== Susunaku payment leg · Stellar testnet ===");
  console.log(`horizon    ${HORIZON}`);
  console.log(`sender     ${short(sender)}`);
  console.log(`recipient  ${short(recipient)}`);
  console.log(`checked at ${new Date().toISOString()}`);

  // --- 1. both accounts exist ------------------------------------------------
  const senderAcc = await get(`/accounts/${sender}`);
  const recipientAcc = await get(`/accounts/${recipient}`);
  if (senderAcc.status !== 200) fail("1", `sender account ${short(sender)} exists`, `HTTP ${senderAcc.status}`);
  if (recipientAcc.status !== 200) fail("1", `recipient account ${short(recipient)} exists`, `HTTP ${recipientAcc.status}`);
  if (senderAcc.status === 200 && recipientAcc.status === 200) {
    pass("1", "both accounts exist on the ledger");
    console.log(`  sender    USDC ${usdc(usdcBalance(senderAcc.body)?.balance)} | XLM ${usdc(xlmBalance(senderAcc.body))}`);
    console.log(`  recipient USDC ${usdc(usdcBalance(recipientAcc.body)?.balance)} | XLM ${usdc(xlmBalance(recipientAcc.body))}`);
  }

  // --- 2. the sender's outbound history ------------------------------------
  const senderPays = await get(`/accounts/${sender}/payments?order=desc&limit=50`);
  const outbound = recordsOf(senderPays).filter(
    (r) => isCredit(r) && (r.to ?? "").toUpperCase() === recipient
  );
  if (outbound.length === 0) {
    fail("2", `no payment from ${short(sender)} to ${short(recipient)} found`,
      "nothing has been sent yet — the app's success message, if any, is not backed by the ledger");
  } else {
    pass("2", `found ${outbound.length} payment(s) from sender to recipient`);
    for (const p of outbound) {
      const tx = p.transaction_hash ? await get(`/transactions/${p.transaction_hash}`) : { body: null };
      const memo = tx.body?.memo ? `${tx.body.memo} (${tx.body.memo_type})` : "none";
      console.log(`  ${p.created_at}  ${p.amount} ${p.asset_code ?? "XLM"}`);
      console.log(`    op type  ${p.type}${p.type !== "payment" ? "   <- app's matcher only accepts \"payment\"" : ""}`);
      console.log(`    issuer   ${p.asset_issuer ?? "—"}`);
      console.log(`    tx       ${p.transaction_hash ?? "—"}`);
      console.log(`    ledger   ${tx.body?.ledger ?? "—"}   memo ${memo}`);
      console.log(`    explorer https://stellar.expert/explorer/testnet/tx/${p.transaction_hash ?? ""}`);
    }
  }

  // --- 3. asset + amount ---------------------------------------------------
  const good = outbound.filter((p) => {
    if ((p.asset_code ?? "").toUpperCase() !== "USDC") return false;
    if ((p.asset_issuer ?? "").toUpperCase() !== USDC_ISSUER) return false;
    return Number(p.amount) + 1e-9 >= minAmount;
  });
  if (good.length > 0) {
    const total = good.reduce((sum, p) => sum + Number(p.amount), 0);
    pass("3", `asset is USDC from the expected issuer, amount >= ${minAmount}`);
    console.log(`  total credited  ${usdc(total)} USDC`);
  } else if (outbound.length > 0) {
    fail("3", "payment exists but asset or amount does not match",
      `expected USDC/${USDC_ISSUER} at least ${minAmount} — the app would NOT count this as a contribution`);
  } else {
    fail("3", "no payment to check");
  }

  // --- 4. recipient reconciliation -----------------------------------------
  const inbound = await get(`/accounts/${recipient}/payments?order=desc&limit=50`);
  const inboundUsdc = recordsOf(inbound).filter(
    (r) => isCredit(r) && (r.asset_code ?? "").toUpperCase() === "USDC"
  );
  const inboundTotal = inboundUsdc.reduce((sum, p) => sum + Number(p.amount), 0);
  const held = usdcBalance(recipientAcc.body);
  if (held) {
    const matches = Math.abs(Number(held.balance) - inboundTotal) < 1e-7;
    console.log(`\n4 · recipient balance reconciles with USDC received`);
    console.log(`  balance          ${usdc(held.balance)} USDC`);
    console.log(`  total received   ${usdc(inboundTotal)} USDC  (${inboundUsdc.length} credit(s))`);
    console.log(`  trustline        ${held.authorized ? "authorized" : "NOT authorized"}`);
    if (matches && held.authorized) {
      console.log(`  PASS  the recipient holds exactly what it was sent`);
    } else {
      failures += 1;
      console.log(`  FAIL  balance does not match what the ledger says was received`);
    }
  } else {
    fail("4", "recipient has no USDC trustline for the expected issuer",
      "a payment to it cannot land — this is the trustline step");
  }

  console.log(`\n=== verdict: ${failures === 0 ? "PAYMENT LEG VERIFIED" : `NOT VERIFIED (${failures} failing check(s))`} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nERROR ${err.message}`);
  process.exit(2);
});
