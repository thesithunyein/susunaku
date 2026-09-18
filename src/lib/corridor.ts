/**
 * The corridor: how money gets into a circle, and how it gets back out.
 *
 * Susunaku settles in USDC on Stellar, but a savings circle only works if a
 * member can put local money in and take local money out. This file is the
 * honest map of that: which legs Pollar can execute today, and which legs are
 * designed but not yet wired.
 *
 * Nothing here is inferred. The `live` legs are the corridors Pollar's own
 * docs list under Dashboard → Integrations → Ramps, and the dashboard only
 * offers a corridor the backend can actually execute. The `designed` legs name
 * a real partner API with public coverage, and are labelled as designed — the
 * brief allows "sandbox or a documented semi-manual flow" for the African leg,
 * and a labelled design beats a pretend integration.
 */

export type CorridorStatus = "live" | "designed";
export type CorridorDirection = "in" | "out" | "both";

export interface CorridorLeg {
  id: string;
  /** Where the person is. */
  country: string;
  fiat: string;
  /** The local rail the person actually touches. */
  rail: string;
  direction: CorridorDirection;
  provider: string;
  status: CorridorStatus;
  note: string;
}

/**
 * LatAm legs — executable through Pollar once a provider is enabled in the
 * dashboard. Bolivia is the ramp this hackathon's Latin side runs on.
 */
export const LATAM_LEGS: CorridorLeg[] = [
  {
    id: "bo-bob",
    country: "Bolivia",
    fiat: "BOB",
    rail: "Bank QR (buy) · ACH (sell)",
    direction: "both",
    provider: "Stereum",
    status: "live",
    note:
      "Buy with a bank QR, sell straight to a bank account. This is the live ramp the hackathon's Latin America side runs on.",
  },
  {
    id: "br-pix-bridge",
    country: "Brazil",
    fiat: "BRL",
    rail: "Pix",
    direction: "both",
    provider: "Bridge",
    status: "live",
    note: "Pix both ways with hosted KYC.",
  },
  {
    id: "br-pix-pag",
    country: "Brazil",
    fiat: "BRL",
    rail: "Pix",
    direction: "in",
    provider: "PagFinance",
    status: "live",
    note:
      "On-ramp live. The off-ramp is deliberately declined: it pays into a shared receiver, so an order cannot be attributed.",
  },
  {
    id: "br-co-abroad",
    country: "Brazil · Colombia",
    fiat: "BRL · COP",
    rail: "Pix · BreB",
    direction: "out",
    provider: "Abroad Finance",
    status: "live",
    note: "Cash-out only. COP over BreB is one of the few non-Pix LatAm rails.",
  },
  {
    id: "mx-spei",
    country: "Mexico",
    fiat: "MXN",
    rail: "SPEI",
    direction: "both",
    provider: "Etherfuse",
    status: "live",
    note: "SPEI both ways, with per-user hosted KYC.",
  },
  {
    id: "anclap",
    country: "Any SEP-24 anchor",
    fiat: "local",
    rail: "SEP-24",
    direction: "both",
    provider: "Anclap",
    status: "live",
    note: "Interoperable escape hatch: any SEP-24 anchor reachable through one adapter.",
  },
];

/** Stated once so the UI and the write-up can never drift apart. */
export const AFRICAN_GAP =
  "Every ramp Pollar can execute today is Latin American — Pix, BreB, SPEI and the Bolivian " +
  "BOB rails. There is no African corridor in the SDK. That is the whole reason the hackathon's " +
  "flagship asks a builder to make that leg exist, and it is the leg that decides whether a " +
  "circle with members in Ghana and Nairobi is usable or merely demonstrable.";

/**
 * African legs — designed, not integrated.
 *
 * Both named providers publish a stablecoin ramp API that reaches mobile money
 * and bank rails across African markets. Neither is wired into Susunaku, and
 * the UI says so rather than implying otherwise.
 */
export const AFRICAN_LEGS: CorridorLeg[] = [
  {
    id: "af-momo-partner",
    country: "Kenya · Ghana · Nigeria · Senegal · Zambia +",
    fiat: "KES · GHS · NGN · XOF · ZMW",
    rail: "M-Pesa · MTN MoMo · Airtel Money · bank transfer",
    direction: "both",
    provider: "Eversend (USDC ramp API)",
    status: "designed",
    note:
      "Stablecoin ↔ mobile money and bank payout across 18 African markets. Designed in, not wired: the same pattern as Pollar's SEP-24 adapter, pointed at an African partner.",
  },
  {
    id: "af-momo-partner-2",
    country: "20 African markets",
    fiat: "local",
    rail: "Mobile money · bank collection",
    direction: "both",
    provider: "Yativo",
    status: "designed",
    note: "Second candidate rail, held as a fallback so the path does not depend on one partner.",
  },
  {
    id: "af-semi-manual",
    country: "Any African market",
    fiat: "local cash",
    rail: "Agent · P2P float",
    direction: "both",
    provider: "Circle organiser + local agent",
    status: "designed",
    note:
      "The documented semi-manual path the brief explicitly allows: the organiser's own float covers a member's contribution in USDC, and settles in local cash the same day. It is what susu collectors already do — the difference is the ledger.",
  },
];

/**
 * Why a circle can span two continents at all: the payer and the recipient
 * never share a currency, only an asset.
 */
export const CORRIDOR_IN_ONE_LINE =
  "A member in Africa pays in from a mobile-money rail; a member in Bolivia cashes out on the BOB " +
  "ramp; both meet in USDC on Stellar. No shared bank, no shared currency, no intermediary holding " +
  "the float.";
