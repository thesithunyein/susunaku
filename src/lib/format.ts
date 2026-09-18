export function shortAddr(addr: string | null | undefined, size = 5): string {
  if (!addr) return "—";
  if (addr.length <= size * 2 + 1) return addr;
  return `${addr.slice(0, size)}…${addr.slice(-size)}`;
}

/** Trims trailing zeros so 10.00 renders as 10 and 2.50 as 2.5. */
export function fmtUsdc(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function fmtUsdcDisplay(value: string | number | null | undefined): string {
  const raw = fmtUsdc(value);
  if (raw === "—") return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function fmtCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "00h 00m 00s";
  const totalSec = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const base = `${pad2(hours)}h ${pad2(mins)}m ${pad2(secs)}s`;
  return days > 0 ? `${days}d ${base}` : base;
}

export function fmtDate(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined) return "—";
  const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
