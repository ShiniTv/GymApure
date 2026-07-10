/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_LANDING_DEMO_EMAIL?: string;
  readonly VITE_LANDING_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
