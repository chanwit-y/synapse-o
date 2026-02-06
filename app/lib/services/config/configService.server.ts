import "server-only";

type EnvServerConfig = {
  dbPath: string;
  redisUrl: string | null;
  /**
   * TTL for DB-backed API key cache (ms).
   * Keep short so updates in Settings take effect quickly.
   */
  apiKeyCacheTtlMs: number;
};

type ApiKeyCache = { value: string | null; loadedAtMs: number };

class ConfigService {
  private envCache: EnvServerConfig | null = null;
  private openAiApiKeyCache: ApiKeyCache | null = null;

  /**
   * Singleton accessor for server env config (no DB access).
   */
  getEnv(): EnvServerConfig {
    if (this.envCache) return this.envCache;

    this.envCache = {
      dbPath: process.env.SYNAPSE_DB_PATH ?? "synapse.db",
      redisUrl: process.env.REDIS_URL ?? null,
      apiKeyCacheTtlMs: Number(process.env.SYNAPSE_API_KEY_CACHE_TTL_MS ?? 10_000),
    };

    return this.envCache;
  }

  /**
   * DB-backed OpenAI API key (from Settings).
   * Uses a short-lived cache to avoid repeated DB reads.
   */
  async getOpenAiApiKey(): Promise<string | null> {
    const { apiKeyCacheTtlMs } = this.getEnv();

    const now = Date.now();
    if (this.openAiApiKeyCache && now - this.openAiApiKeyCache.loadedAtMs < apiKeyCacheTtlMs) {
      return this.openAiApiKeyCache.value;
    }

    // Dynamic import avoids circular deps with DB layer.
    const mod = await import("@/app/lib/db/repository/api-key");
    const repo = new mod.ApiKeyRepository();
    const apiKey = (await repo.findAll())?.[0]?.apiKey ?? null;

    this.openAiApiKeyCache = { value: apiKey, loadedAtMs: now };
    return apiKey;
  }

  invalidateOpenAiApiKey(): void {
    this.openAiApiKeyCache = null;
  }
}

export const configService = new ConfigService();

