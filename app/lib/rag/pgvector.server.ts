import "server-only";

import { Pool, type PoolClient } from "pg";

export type RagTransactionRow = {
	id: string;
	ragName: string;
	collection: string | null;
	updatedAt: string;
	updatedBy: string;
};

/**
 * 1 row = 1 chunk (embedding-ready) for RAG.
 * Groups chunks from the same original .md under `documentId`.
 */
export type RagDocumentChunkInsert = {
	id: string;
	ragId: string;
	documentId: string;
	source: string | null;
	chunkType: string;
	chunkIndex: number;
	content: string;
	embedding: number[];
	metadata: Record<string, unknown> | null;
};

function getPgvectorUrl(): string {
	const url =
		process.env.RAG_PGVECTOR_URL ??
		process.env.PGVECTOR_URL ??
		process.env.DATABASE_URL ??
		"";
	if (!url.trim()) {
		throw new Error(
			"Missing pgvector connection string. Set RAG_PGVECTOR_URL (e.g. postgres://postgres:secret@localhost:5432/ragdb).",
		);
	}
	return url;
}

let poolSingleton: Pool | null = null;

function getPool(): Pool {
	if (poolSingleton) return poolSingleton;
	poolSingleton = new Pool({
		connectionString: getPgvectorUrl(),
		// Local dev defaults; keep small.
		max: Number(process.env.RAG_PGVECTOR_POOL_MAX ?? 5),
	});
	return poolSingleton;
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
	const pool = getPool();
	const client = await pool.connect();
	try {
		return await fn(client);
	} finally {
		client.release();
	}
}

/**
 * Ensure RAG + pgvector schema exists.
 * Safe to call repeatedly.
 */
export async function ensurePgvectorSchema(): Promise<void> {
	await withClient(async (client) => {
		await client.query("CREATE EXTENSION IF NOT EXISTS vector;");

		await client.query(`
			CREATE TABLE IF NOT EXISTS rag_transactions (
				id uuid PRIMARY KEY,
				rag_name text NOT NULL,
				collection text,
				updated_by text NOT NULL DEFAULT 'SYSTEM',
				updated_at timestamptz NOT NULL DEFAULT now(),
				created_at timestamptz NOT NULL DEFAULT now()
			);
		`);

		// Document chunks (1 row = 1 chunk + embedding). This is the primary vector store.
		await client.query(`
			CREATE TABLE IF NOT EXISTS rag_documents (
				id uuid PRIMARY KEY,
				rag_id uuid NOT NULL REFERENCES rag_transactions(id) ON DELETE CASCADE,
				document_id uuid,
				source text,
				chunk_type text NOT NULL DEFAULT 'paragraph',
				chunk_index integer,
				content text,
				embedding vector(1536),
				metadata jsonb,
				created_at timestamptz NOT NULL DEFAULT now()
			);
		`);

		// If `rag_documents` existed as metadata-only table, add the chunk columns (nullable for backward compat).
		await client.query("ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_id uuid;");
		await client.query("ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS chunk_index integer;");
		await client.query("ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content text;");
		await client.query("ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);");
		await client.query("ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS metadata jsonb;");

		// Legacy chunks table (kept for compatibility; new ingestion uses rag_documents only).
		await client.query(`
			CREATE TABLE IF NOT EXISTS rag_md_chunks (
				id uuid PRIMARY KEY,
				rag_id uuid REFERENCES rag_transactions(id) ON DELETE CASCADE,
				doc_id uuid NOT NULL,
				source text,
				chunk_type text NOT NULL DEFAULT 'paragraph',
				chunk_index integer NOT NULL,
				content text NOT NULL,
				embedding vector(1536) NOT NULL,
				metadata jsonb,
				created_at timestamptz NOT NULL DEFAULT now()
			);
		`);

		// Backfill support when table existed before `chunk_type`.
		await client.query("ALTER TABLE rag_md_chunks ADD COLUMN IF NOT EXISTS chunk_type text;");
		await client.query("ALTER TABLE rag_md_chunks ADD COLUMN IF NOT EXISTS rag_id uuid;");
		await client.query("UPDATE rag_md_chunks SET chunk_type = 'paragraph' WHERE chunk_type IS NULL;");
		await client.query("ALTER TABLE rag_md_chunks ALTER COLUMN chunk_type SET NOT NULL;");
		await client.query("ALTER TABLE rag_md_chunks ALTER COLUMN chunk_type SET DEFAULT 'paragraph';");

		// Ensure we don't keep a partial/legacy FK that can block ingestion.
		await client.query("ALTER TABLE rag_md_chunks DROP CONSTRAINT IF EXISTS rag_md_chunks_doc_id_fkey;");

		await client.query("CREATE INDEX IF NOT EXISTS rag_transactions_updated_at_idx ON rag_transactions (updated_at DESC);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_documents_rag_id_idx ON rag_documents (rag_id);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_documents_document_id_idx ON rag_documents (document_id);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_documents_chunk_type_idx ON rag_documents (chunk_type);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_md_chunks_doc_id_idx ON rag_md_chunks (doc_id);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_md_chunks_rag_id_idx ON rag_md_chunks (rag_id);");
		await client.query("CREATE INDEX IF NOT EXISTS rag_md_chunks_chunk_type_idx ON rag_md_chunks (chunk_type);");
	});
}

function embeddingToVectorLiteral(embedding: number[]): string {
	// pgvector accepts '[1,2,3]' literal for `vector`.
	return `[${embedding.join(",")}]`;
}

export async function insertRagDocumentChunks(chunks: RagDocumentChunkInsert[]): Promise<{ inserted: number }> {
	if (!Array.isArray(chunks) || chunks.length === 0) return { inserted: 0 };

	await ensurePgvectorSchema();

	return withClient(async (client) => {
		await client.query("BEGIN");
		try {
			for (const row of chunks) {
				await client.query(
					`
					INSERT INTO rag_documents
						(id, rag_id, document_id, source, chunk_type, chunk_index, content, embedding, metadata)
					VALUES
						($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::int, $7::text, $8::vector, $9::jsonb)
					ON CONFLICT (id) DO NOTHING;
				`,
					[
						row.id,
						row.ragId,
						row.documentId,
						row.source,
						row.chunkType,
						row.chunkIndex,
						row.content,
						embeddingToVectorLiteral(row.embedding),
						row.metadata ? JSON.stringify(row.metadata) : null,
					],
				);
			}
			await client.query("COMMIT");
			return { inserted: chunks.length };
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		}
	});
}

export async function createRagTransactionPg(input: {
	ragName: string;
	collection: string;
	updatedBy?: string;
	id?: string;
}): Promise<RagTransactionRow> {
	await ensurePgvectorSchema();
	return withClient(async (client) => {
		const id = input.id ?? crypto.randomUUID();
		const updatedBy = (input.updatedBy ?? "SYSTEM").trim() || "SYSTEM";
		const ragName = input.ragName.trim();
		const collection = input.collection.trim();
		const res = await client.query(
			`
			INSERT INTO rag_transactions (id, rag_name, collection, updated_by)
			VALUES ($1::uuid, $2::text, $3::text, $4::text)
			RETURNING
				id::text as "id",
				rag_name as "ragName",
				collection as "collection",
				updated_at::text as "updatedAt",
				updated_by as "updatedBy";
		`,
			[id, ragName, collection, updatedBy],
		);
		return res.rows[0] as RagTransactionRow;
	});
}

export async function listRagTransactionsPg(): Promise<RagTransactionRow[]> {
	await ensurePgvectorSchema();
	return withClient(async (client) => {
		const res = await client.query(`
			SELECT
				id::text as "id",
				rag_name as "ragName",
				collection as "collection",
				updated_at::text as "updatedAt",
				updated_by as "updatedBy"
			FROM rag_transactions
			ORDER BY updated_at DESC;
		`);
		return res.rows as RagTransactionRow[];
	});
}

export async function deleteRagTransactionPg(id: string): Promise<boolean> {
	await ensurePgvectorSchema();
	return withClient(async (client) => {
		const res = await client.query("DELETE FROM rag_transactions WHERE id = $1::uuid;", [id]);
		return (res.rowCount ?? 0) > 0;
	});
}

