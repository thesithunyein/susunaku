import { EXPLORER, HORIZON, type StellarNetwork } from "./config";

/**
 * Round status is read from Stellar, not from our own tables.
 *
 * Susunaku keeps no ledger of who paid: it asks Horizon what actually moved.
 * That is the whole point — a receipt anyone can check is worth more than a
 * row in a database only we can see.
 */

export interface ChainPayment {
  hash: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  assetIssuer: string | null;
  createdAt: string;
  explorerUrl: string;
}

interface HorizonPaymentRecord {
  type?: string;
  transaction_hash?: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_code?: string;
  asset_issuer?: string;
  created_at?: string;
}

interface HorizonPaymentsPage {
  _embedded?: { records?: HorizonPaymentRecord[] };
}

export function explorerTx(hash: string, network: StellarNetwork): string {
  return `${EXPLORER[network]}/tx/${hash}`;
}

export function explorerAccount(address: string, network: StellarNetwork): string {
  return `${EXPLORER[network]}/account/${address}`;
}

export type PaymentLookup =
  | { status: "found"; payment: ChainPayment }
  | { status: "missing" }
  | { status: "unknown-account" }
  | { status: "error"; message: string };

/**
 * Most recent payments out of an account. A 404 means the account has never
 * been funded on this network, which is a normal and reportable state, not a
 * failure.
 */
export async function fetchPayments(
  address: string,
  network: StellarNetwork,
  limit = 50
): Promise<{ ok: true; payments: ChainPayment[] } | { ok: false; reason: "unknown-account" | "error"; message?: string }> {
  const url = `${HORIZON[network]}/accounts/${encodeURIComponent(
    address
  )}/payments?order=desc&limit=${limit}&include_failed=false`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/hal+json" } });
    if (res.status === 404) return { ok: false, reason: "unknown-account" };
    if (!res.ok) {
      return { ok: false, reason: "error", message: `Horizon responded ${res.status}` };
    }
    const page = (await res.json()) as HorizonPaymentsPage;
    const records = page._embedded?.records ?? [];
    const payments: ChainPayment[] = [];
    for (const r of records) {
      if (r.type !== "payment") continue;
      if (!r.transaction_hash || !r.from || !r.to || !r.amount) continue;
      payments.push({
        hash: r.transaction_hash,
        from: r.from,
        to: r.to,
        amount: r.amount,
        assetCode: r.asset_code ?? "XLM",
        assetIssuer: r.asset_issuer ?? null,
        createdAt: r.created_at ?? "",
        explorerUrl: explorerTx(r.transaction_hash, network),
      });
    }
    return { ok: true, payments };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Network error talking to Horizon",
    };
  }
}

export interface ContributionQuery {
  from: string;
  to: string;
  minAmount: number;
  assetIssuer: string;
  /** Only payments at or after the round opened count. */
  after: number;
  /** ...and before the round closed, so an old payment cannot satisfy a new round. */
  before: number;
  network: StellarNetwork;
}

/**
 * Did `from` actually pay `to` this round? Matches on recipient, asset,
 * amount and the round's time window, so a payment made last round cannot be
 * counted twice.
 */
export function matchContribution(
  payments: ChainPayment[],
  query: ContributionQuery
): ChainPayment | null {
  const target = query.to.trim().toUpperCase();
  const issuer = query.assetIssuer.trim().toUpperCase();

  for (const p of payments) {
    if (p.to.trim().toUpperCase() !== target) continue;
    if (p.assetCode !== "USDC") continue;
    if ((p.assetIssuer ?? "").trim().toUpperCase() !== issuer) continue;
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount + 1e-9 < query.minAmount) continue;
    const at = Date.parse(p.createdAt);
    if (Number.isNaN(at)) continue;
    if (at < query.after) continue;
    if (at > query.before) continue;
    return p;
  }
  return null;
}

export async function verifyContribution(query: ContributionQuery): Promise<PaymentLookup> {
  const result = await fetchPayments(query.from, query.network);
  if (!result.ok) {
    if (result.reason === "unknown-account") return { status: "unknown-account" };
    return { status: "error", message: result.message ?? "Horizon lookup failed" };
  }
  const match = matchContribution(result.payments, query);
  return match ? { status: "found", payment: match } : { status: "missing" };
}
