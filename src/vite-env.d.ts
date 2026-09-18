/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POLLAR_PUBLISHABLE_KEY?: string;
  readonly VITE_STELLAR_NETWORK?: string;
  readonly VITE_USDC_ISSUER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
