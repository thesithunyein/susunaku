#!/usr/bin/env node
/**
 * Dev helper: put native XLM into a wallet so it can pay a network fee.
 *
 *   node scripts/fund-gas.mjs <address> [xlm]
 *
 * Why this exists: on Stellar the fee for a payment comes from the sending
 * account's own XLM balance. Pollar sponsors the wallet and its trustlines, so
 * a new member starts with a working USDC wallet and zero XLM — and then the
 * very first contribution fails with "Not enough XLM to cover the network fee"
 * before anything is submitted. A real deployment would sponsor the fee with a
 * fee-bump transaction; for testnet, funding the member's own account is the
 * honest stand-in.
 *
 * TESTNET ONLY. The funding account is a throwaway.
 */
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";

const [, , targetArg, amountArg] = process.argv;
const amount = amountArg ?? "2";

if (!targetArg || !/^G[A-Z2-7]{55}$/.test(targetArg.trim().toUpperCase())) {
  console.error("usage: node scripts/fund-gas.mjs <G-address> [xlm]");
  process.exit(2);
}

const target = targetArg.trim().toUpperCase();
const server = new Horizon.Server(HORIZON);
const keypair = Keypair.random();

console.log("\n=== fund-gas · Stellar testnet ===");
console.log(`target     ${target}`);
console.log(`amount     ${amount} XLM`);

// 1. A throwaway account with enough XLM to hand out gas.
const fund = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(keypair.publicKey())}`);
if (!fund.ok && fund.status !== 400) {
  throw new Error(`friendbot returned HTTP ${fund.status}`);
}
console.log(`  ✓ gas source ${keypair.publicKey().slice(0, 8)}… funded`);

// 2. Send the XLM.
const source = await server.loadAccount(keypair.publicKey());
const tx = new TransactionBuilder(source, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.payment({
      destination: target,
      asset: Asset.native(),
      amount,
    })
  )
  .setTimeout(60)
  .build();
tx.sign(keypair);

const submitted = await server.submitTransaction(tx);
console.log(`  ✓ sent (${submitted.hash.slice(0, 16)}…)`);

// 3. Read the target back from Horizon rather than trusting the submit ack.
const after = await server.loadAccount(target);
const native = after.balances.find((b) => b.asset_type === "native");
const sponsoredReserve = after.num_sponsored;
console.log(
  `  ✓ target native balance now ${native?.balance} XLM (num_sponsored ${sponsoredReserve})`
);
console.log(`  explorer https://stellar.expert/explorer/testnet/account/${target}\n`);
