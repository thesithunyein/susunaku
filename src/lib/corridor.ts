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
    note: "Buy by bank QR, sell to a bank account.",
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
    note: "On-ramp only: its off-ramp pays a shared receiver, so an order can't be attributed.",
  },
  {
    id: "br-co-abroad",
    country: "Brazil · Colombia",
    fiat: "BRL · COP",
    rail: "Pix · BreB",
    direction: "out",
    provider: "Abroad Finance",
    status: "live",
    note: "Cash-out only. COP over BreB is a rare non-Pix rail.",
  },
  {
    id: "mx-spei",
    country: "Mexico",
    fiat: "MXN",
    rail: "SPEI",
    direction: "both",
    provider: "Etherfuse",
    status: "live",
    note: "SPEI both ways, hosted KYC.",
  },
  {
    id: "anclap",
    country: "Any SEP-24 anchor",
    fiat: "local",
    rail: "SEP-24",
    direction: "both",
    provider: "Anclap",
    status: "live",
    note: "Any SEP-24 anchor, through one adapter.",
  },
];

/** Stated once so the UI and the write-up can never drift apart. */
export const AFRICAN_GAP =
  "Every ramp Pollar can execute today is Latin American: Pix, BreB, SPEI, BOB. There is no " +
  "African corridor in the SDK — which is the leg that decides whether a circle with members in " +
  "Ghana and Nairobi is usable or just demonstrable.";

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
      "Mobile money and bank payout across 18 African markets. Same shape as Pollar's SEP-24 adapter.",
  },
  {
    id: "af-momo-partner-2",
    country: "20 African markets",
    fiat: "local",
    rail: "Mobile money · bank collection",
    direction: "both",
    provider: "Yativo",
    status: "designed",
    note: "A second rail, so the path doesn't depend on one partner.",
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
      "The organiser's float covers a contribution in USDC and settles in local cash the same day — what susu collectors already do.",
  },
];

/**
 * Why a circle can span two continents at all: the payer and the recipient
 * never share a currency, only an asset.
 */
export const CORRIDOR_IN_ONE_LINE =
  "A member in Africa pays in from mobile money. A member in Bolivia cashes out on the BOB ramp. " +
  "Both meet in USDC on Stellar.";
