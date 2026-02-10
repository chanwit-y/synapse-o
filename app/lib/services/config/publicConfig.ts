/**
 * @file publicConfig.ts
 * @description Public configuration accessor exposing browser-safe config like the API base URL.
 */
export type PublicConfig = {
  /**
   * Base URL used by client-side API calls.
   * Must be safe to expose to the browser.
   */
  apiBaseUrl: string;
};

let _publicConfig: PublicConfig | null = null;

/**
 * Singleton accessor for public (browser-safe) config.
 */
export function getPublicConfig(): PublicConfig {
  if (_publicConfig) return _publicConfig;

  _publicConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  };

  return _publicConfig;
}

