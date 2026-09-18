import type { Circle } from "./circle";

/**
 * Circles travel by link, not by account.
 *
 * A circle is a small agreed-upon object — amount, cadence, members, rotation
 * order — so we can put the whole thing in the invite URL. Members join by
 * opening it; nothing needs to be registered on a server for the circle to
 * exist, and the money only ever moves between the members themselves.
 */

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "===".slice((padded.length + 3) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeCircle(circle: Circle): string {
  return toBase64Url(JSON.stringify(circle));
}

export function decodeCircle(payload: string): Circle | null {
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Circle;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.members) || parsed.members.length < 2) return null;
    if (!Array.isArray(parsed.order) || parsed.order.length === 0) return null;
    if (!Number.isFinite(parsed.amountUsdc) || parsed.amountUsdc <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function circleShareUrl(circle: Circle): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/join?c=${encodeCircle(circle)}`;
}
