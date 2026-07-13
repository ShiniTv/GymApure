/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ALLOW_PUBLIC_REGISTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
