import "server-only";

import crypto from "crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient, type RedisClientType } from "redis";

export interface AiSemanticCacheRedisConfig {
  /**
   * Redis URL, e.g. redis://localhost:6379
   * If omitted, `process.env.REDIS_URL` is used.
   */
  redisUrl?: string;
  /**
   * RedisSearch index name.
   */
  indexName?: string;
  /**
   * Similarity threshold in [0..1]. Higher = stricter.
   * Computed as \(1 - distance\) where distance is the KNN score.
   */
  similarityThreshold?: number;
  /**
   * Default TTL (seconds) for written cache entries.
   */
  defaultTtlSec?: number;
  /**
   * Embedding model name. Defaults to `text-embedding-3-large` to match the reference.
   */
  embeddingModel?: string;
  /**
   * Embedding dimensions for the index schema.
   * `text-embedding-3-large` is 3072.
   */
  embeddingDim?: number;
  /**
   * Key prefix used for cache entries.
   */
  keyPrefix?: string;
}

type CacheHit = { answer: string; similarity: number };

let singletonRedisClient: RedisClientType | null = null;

function getRedisClient(redisUrl: string): RedisClientType {
  if (!singletonRedisClient) {
    singletonRedisClient = createClient({ url: redisUrl });
    singletonRedisClient.on("error", () => {
      // Intentionally swallow to avoid crashing server actions/routes.
      // Connection errors will surface on awaited ops anyway.
    });
  }
  return singletonRedisClient;
}

function toFloat32Buffer(vector: number[]): Buffer {
  return Buffer.from(new Float32Array(vector).buffer);
}

function parseFtSearchFirstHit(reply: unknown): { answer?: string; score?: string } | null {
  // Expected (Redis FT.SEARCH) shape:
  // [total, docId, [field, value, field, value, ...], docId, [..], ...]
  if (!Array.isArray(reply) || reply.length < 3) return null;
  const total = Number(reply[0] ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;

  const fields = reply[2];
  if (!Array.isArray(fields)) return null;

  const map: Record<string, unknown> = {};
  for (let i = 0; i < fields.length - 1; i += 2) {
    const k = fields[i];
    const v = fields[i + 1];
    if (typeof k === "string") map[k] = v;
  }

  const answer = typeof map.answer === "string" ? map.answer : undefined;
  const score =
    typeof map.score === "string"
      ? map.score
      : typeof map.score === "number"
        ? String(map.score)
        : undefined;

  return { answer, score };
}

export class AiSemanticCacheRedis {
  private readonly redisUrl: string | null;
  private readonly indexName: string;
  private readonly similarityThreshold: number;
  private readonly defaultTtlSec: number;
  private readonly embeddingModel: string;
  private readonly embeddingDim: number;
  private readonly keyPrefix: string;

  private readonly redis: RedisClientType | null;

  constructor(config: AiSemanticCacheRedisConfig = {}) {
    const redisUrl = config.redisUrl ?? process.env.REDIS_URL ?? null;
    this.redisUrl = redisUrl;

    this.indexName = config.indexName ?? "ai_semantic_cache_idx";
    this.similarityThreshold = config.similarityThreshold ?? 0.9;
    this.defaultTtlSec = config.defaultTtlSec ?? 86400;
    this.embeddingModel = config.embeddingModel ?? "text-embedding-3-large";
    this.embeddingDim = config.embeddingDim ?? 3072;
    this.keyPrefix = config.keyPrefix ?? "sc:";

    this.redis = redisUrl ? getRedisClient(redisUrl) : null;
  }

  /**
   * Connect to Redis (no-op if REDIS_URL is missing).
   */
  async init(): Promise<void> {
    if (!this.redis) return;
    if (!this.redis.isOpen) {
      await this.redis.connect();
    }
  }

  /**
   * Create the RedisSearch index if missing.
   * This requires Redis Stack (RediSearch). It is safe to call multiple times.
   */
  async ensureIndex(): Promise<void> {
    if (!this.redis) return;
    await this.init();

    try {
      await this.redis.sendCommand(["FT.INFO", this.indexName]);
      return;
    } catch {
      // fall through and try to create
    }

    // HNSW args: TYPE FLOAT32, DIM <dim>, DISTANCE_METRIC COSINE  => 6 tokens after "HNSW"
    await this.redis.sendCommand([
      "FT.CREATE",
      this.indexName,
      "ON",
      "HASH",
      "PREFIX",
      "1",
      this.keyPrefix,
      "SCHEMA",
      "domain",
      "TAG",
      "version",
      "TAG",
      "answer",
      "TEXT",
      "embedding",
      "VECTOR",
      "HNSW",
      "6",
      "TYPE",
      "FLOAT32",
      "DIM",
      String(this.embeddingDim),
      "DISTANCE_METRIC",
      "COSINE",
    ]);
  }

  async embed(text: string, apiKey: string): Promise<number[]> {
    const embeddings = new OpenAIEmbeddings({
      apiKey,
      model: this.embeddingModel,
    });

    return await embeddings.embedQuery(text);
  }

  /**
   * Low-level semantic lookup mirroring the reference implementation.
   */
  async semanticLookup(embedding: number[], domain: string, version: string): Promise<CacheHit | null> {
    if (!this.redis) return null;
    await this.init();

    const query = `(@domain:{${domain}} @version:{${version}}) => [KNN 1 @embedding $vec AS score]`;
    const vec = toFloat32Buffer(embedding);

    try {
      const reply = await this.redis.sendCommand([
        "FT.SEARCH",
        this.indexName,
        query,
        "PARAMS",
        "2",
        "vec",
        vec,
        "SORTBY",
        "score",
        "DIALECT",
        "2",
        "RETURN",
        "2",
        "answer",
        "score",
      ]);

      const hit = parseFtSearchFirstHit(reply);
      if (!hit?.answer || !hit.score) return null;

      const similarity = 1 - Number(hit.score);
      if (!Number.isFinite(similarity)) return null;

      return similarity >= this.similarityThreshold
        ? { answer: hit.answer, similarity }
        : null;
    } catch {
      // RedisSearch not available or index missing; treat as cache miss.
      return null;
    }
  }

  /**
   * Low-level write mirroring the reference implementation.
   */
  async writeSemanticCache(
    embedding: number[],
    answer: string,
    domain: string,
    version: string,
    ttlSec: number = this.defaultTtlSec
  ): Promise<void> {
    if (!this.redis) return;
    await this.init();

    const key = `${this.keyPrefix}${crypto.randomUUID()}`;
    const vec = toFloat32Buffer(embedding);

    try {
      await this.redis.sendCommand([
        "HSET",
        key,
        "embedding",
        vec,
        "answer",
        answer,
        "domain",
        domain,
        "version",
        version,
      ]);
      await this.redis.sendCommand(["EXPIRE", key, String(ttlSec)]);
    } catch {
      // Ignore cache write failures.
    }
  }

  /**
   * Convenience: embed(text) then semanticLookup.
   */
  async lookupText(text: string, domain: string, version: string, apiKey: string): Promise<string | null> {
    const embedding = await this.embed(text, apiKey);
    const hit = await this.semanticLookup(embedding, domain, version);
    return hit?.answer ?? null;
  }

  /**
   * Convenience: embed(text) then writeSemanticCache.
   */
  async writeText(
    text: string,
    answer: string,
    domain: string,
    version: string,
    apiKey: string,
    ttlSec: number = this.defaultTtlSec
  ): Promise<void> {
    const embedding = await this.embed(text, apiKey);
    await this.writeSemanticCache(embedding, answer, domain, version, ttlSec);
  }
}

