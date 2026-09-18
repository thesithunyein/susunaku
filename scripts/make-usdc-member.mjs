#!/usr/bin/env node
/**
 * Dev helper: mint a Stellar TESTNET account that can *receive* USDC.
 *
 *   node scripts/make-usdc-member.mjs [name]
 *
 * A circle member has to be able to receive USDC, and on Stellar that needs a
 * trustline — so a bare Friendbot account can't be a member. This creates a
 * throwaway account, funds it, and establishes the Circle testnet USDC
 * trustline, which means you can add a second member without a second email
 * login.
 *
 * The recipient does not have to be a Pollar wallet: on-chain, USDC moves
 * wallet to wallet, whoever holds the keys. That is the point of the product.
 *
 * TESTNET ONLY. These keys are throwaway — never reuse them for anything real.
 */
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";

const name = (process.argv[2] ?? "member").trim() || "member";
const server = new Horizon.Server(HORIZON);
const keypair = Keypair.random();
const address = keypair.publicKey();

console.log(`\n  ${name}`);
console.log(`  ${address}\n`);

// 1. Create and fund the account. Friendbot funds an existing account with 400.
const fund = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(address)}`);
if (fund.status === 400) {
  console.log("  · account already funded");
} else if (!fund.ok) {
  throw new Error(`friendbot returned HTTP ${fund.status}`);
} else {
  console.log("  ✓ funded via friendbot (10,000 XLM)");
}

// 2. Establish the USDC trustline, or a USDC payment would fail to land.
const account = await server.loadAccount(address);
const tx = new TransactionBuilder(account, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER) }))
  .setTimeout(60)
  .build();
tx.sign(keypair);

const submitted = await server.submitTransaction(tx);
console.log(`  ✓ USDC trustline established (${submitted.hash.slice(0, 16)}…)`);

// 3. Prove it, so the caller never has to take this script's word for it.
const check = await server.loadAccount(address);
const line = check.balances.find(
  (b) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
);
console.log(
  `  ✓ verified on Horizon: ${line ? `authorized=${line.is_authorized}` : "NO USDC LINE — something is wrong"}`
);

console.log(`\n  paste as a member:\n  ${address}`);
console.log(`\n  secret (testnet only, keep if you need to spend from it):\n  ${keypair.secret()}\n`);
