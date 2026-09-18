import type { StellarNetwork } from "./config";

/**
 * A Susunaku circle is a schedule, not a vault.
 *
 * Members agree on an amount, a cadence and a rotation order. Each round, every
 * member except the one receiving pays that member directly. No balance is ever
 * pooled anywhere, so there is no custodian and nothing to steal.
 */

export type Cadence = "daily" | "weekly" | "monthly";

export interface Member {
  id: string;
  name: string;
  country: string;
  /** Stellar G-address of this member's own wallet. */
  address: string;
  /** True for the signed-in user, so the UI can foreground their own actions. */
  isMe?: boolean;
}

export interface Circle {
  id: string;
  name: string;
  amountUsdc: number;
  cadence: Cadence;
  members: Member[];
  /** Member ids in the order they receive the round payout. */
  order: string[];
  createdAt: number;
  startAt: number;
  network: StellarNetwork;
}

export const CADENCE_MS: Record<Cadence, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "every day",
  weekly: "every week",
  monthly: "every month",
};

export const CADENCE_PERIODS_PER_YEAR: Record<Cadence, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
};

/** Total number of rounds equals the number of members: each one receives once. */
export function totalRounds(circle: Circle): number {
  return circle.members.length;
}

/**
 * Which round is live. Rounds advance on the cadence clock from `startAt`,
 * clamped to the final round so a finished circle does not run off the end.
 */
export function currentRound(circle: Circle, now = Date.now()): number {
  const rounds = totalRounds(circle);
  if (rounds <= 1) return 0;
  const elapsed = now - circle.startAt;
  const index = Math.floor(elapsed / CADENCE_MS[circle.cadence]);
  return Math.min(Math.max(index, 0), rounds - 1);
}

export function isComplete(circle: Circle, now = Date.now()): boolean {
  const rounds = totalRounds(circle);
  if (rounds <= 1) return false;
  return now - circle.startAt >= rounds * CADENCE_MS[circle.cadence];
}

export function roundWindow(
  circle: Circle,
  round: number
): { start: number; end: number } {
  const period = CADENCE_MS[circle.cadence];
  const start = circle.startAt + round * period;
  return { start, end: start + period };
}

export function roundsRemaining(circle: Circle, now = Date.now()): number {
  return Math.max(0, totalRounds(circle) - currentRound(circle, now) - 1);
}

export function recipientOf(circle: Circle, round: number): Member | undefined {
  const id = circle.order[round];
  return circle.members.find((m) => m.id === id);
}

/** Everyone who owes the recipient this round: every member except the recipient. */
export function contributorsOf(circle: Circle, round: number): Member[] {
  const recipient = recipientOf(circle, round);
  return circle.members.filter((m) => m.id !== recipient?.id);
}

export function findMember(
  circle: Circle,
  address: string | null | undefined
): Member | undefined {
  if (!address) return undefined;
  const needle = address.trim().toUpperCase();
  return circle.members.find((m) => m.address.trim().toUpperCase() === needle);
}

/** The total that changes hands in a round: contribution x everyone who pays. */
export function roundValue(circle: Circle, round: number): number {
  return circle.amountUsdc * contributorsOf(circle, round).length;
}

/** Total volume the circle moves over its whole life. */
export function circleLifetimeVolume(circle: Circle): number {
  const members = circle.members.length;
  return circle.amountUsdc * members * (members - 1);
}

/**
 * Payments per member per year — the number that matters to a payment
 * processor, and the reason daily circles beat monthly ones.
 */
export function paymentsPerMemberPerYear(circle: Circle): number {
  const members = circle.members.length;
  const perRound = members - 1;
  return perRound * CADENCE_PERIODS_PER_YEAR[circle.cadence];
}

export function newMemberId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

export function newCircleId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function isStellarAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value.trim().toUpperCase());
}

export function normalizeAddress(value: string): string {
  return value.trim().toUpperCase();
}
