/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KIOSK_KEY?: string;
  readonly VITE_EXCHANGE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
