/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_PROXY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
