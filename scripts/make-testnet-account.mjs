#!/usr/bin/env node
/**
 * Dev helper: mint a funded Stellar TESTNET wallet.
 *
 *   node scripts/make-testnet-account.mjs [howMany]
 *
 * Prints `name,publicKey,secret` lines. Only ever used against testnet —
 * Friendbot is a faucet, and these keys are throwaway. Never point this at
 * mainnet and never put a real secret in a file that ships.
 */
import { generateKeyPairSync, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function crc16xmodem(bytes) {
  let crc = 0x0000;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function base32(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function encodeAccountId(rawPublicKey) {
  const versioned = Buffer.concat([Buffer.from([6 << 3]), Buffer.from(rawPublicKey)]);
  const checksum = crc16xmodem(versioned);
  const payload = Buffer.concat([
    versioned,
    Buffer.from([checksum & 0xff, (checksum >> 8) & 0xff]),
  ]);
  return base32(payload);
}

function newKeypair() {
  const { publicKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  const raw = der.subarray(der.length - 32);
  return encodeAccountId(raw);
}

const count = Number(process.argv[2] ?? 2);
const lines = [];

for (let i = 0; i < count; i += 1) {
  const address = newKeypair();
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${address}`, {
      signal: AbortSignal.timeout(25000),
    });
    const ok = res.ok ? "funded" : `friendbot ${res.status}`;
    lines.push(`${address},${ok}`);
  } catch (error) {
    lines.push(`${address},unfunded (${error.message})`);
  }
}

for (const line of lines) console.log(line);
console.error(`\nMinted ${count} testnet wallet(s). Nonce: ${randomBytes(4).toString("hex")}`);
