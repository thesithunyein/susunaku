export type StellarNetwork = "testnet" | "mainnet";

/** Circle USDC on Stellar. Mainnet is issued by Circle; testnet USDC is Circle's testnet asset. */
export const USDC_ISSUER: Record<StellarNetwork, string> = {
  mainnet: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  testnet: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};

export const HORIZON: Record<StellarNetwork, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

export const EXPLORER: Record<StellarNetwork, string> = {
  testnet: "https://stellar.expert/explorer/testnet",
  mainnet: "https://stellar.expert/explorer/public",
};

/** Faucets, only meaningful on testnet. */
export const FAUCETS = {
  xlm: "https://friendbot.stellar.org",
  usdc: "https://faucet.circle.com/",
};

export const NETWORK: StellarNetwork =
  import.meta.env.VITE_STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

export const USDC_ISSUER_ACTIVE: string =
  import.meta.env.VITE_USDC_ISSUER?.trim() || USDC_ISSUER[NETWORK];

const KEY_STORAGE = "susunaku.pollar.publishable_key";

/**
 * The publishable key can arrive two ways: baked in at build time, or pasted
 * into the app once and remembered locally. The env var always wins.
 */
export function readStoredKey(): string | null {
  try {
    return window.localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function resolveApiKey(): string | null {
  const fromEnv = import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY?.trim();
  if (fromEnv) return fromEnv;
  return readStoredKey();
}

export function storeApiKey(key: string): void {
  try {
    window.localStorage.setItem(KEY_STORAGE, key.trim());
  } catch {
    /* private mode: the key simply won't persist */
  }
}

export function apiKeyLooksValid(key: string): boolean {
  return /^(pub|sec)_(testnet|mainnet)_[A-Za-z0-9]{8,}$/.test(key.trim());
}

export function apiKeyIsSecret(key: string): boolean {
  return /^sec_/.test(key.trim());
}

export function keyNetwork(key: string): StellarNetwork | null {
  if (/_testnet_/.test(key)) return "testnet";
  if (/_mainnet_/.test(key)) return "mainnet";
  return null;
}
