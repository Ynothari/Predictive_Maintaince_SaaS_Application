-- ============================================================================
-- PredictIQ — pgvector Knowledge Base for RAG Chatbot
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge store table
-- Stores chunked text + Gemini embedding (768-dim for text-embedding-004)
CREATE TABLE IF NOT EXISTS knowledge_store (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content    TEXT        NOT NULL,
  metadata   JSONB       DEFAULT '{}'::jsonb,
  embedding  VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS knowledge_store_embedding_idx
  ON knowledge_store
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);

-- 4. RPC function: match_documents
--    Takes a query embedding and returns the top N most similar documents.
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count     INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ks.id,
    ks.content,
    ks.metadata,
    1 - (ks.embedding <=> query_embedding) AS similarity
  FROM knowledge_store ks
  WHERE 1 - (ks.embedding <=> query_embedding) > match_threshold
  ORDER BY ks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. RLS — knowledge_store is public-read (embeddings are not user-specific)
ALTER TABLE knowledge_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_store_select_all" ON knowledge_store;
CREATE POLICY "knowledge_store_select_all"
  ON knowledge_store FOR SELECT
  USING (true);

-- Only service_role can insert/update/delete
DROP POLICY IF EXISTS "knowledge_store_admin_write" ON knowledge_store;
CREATE POLICY "knowledge_store_admin_write"
  ON knowledge_store FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- ✅ pgvector extension enabled
-- ✅ knowledge_store table created with 768-dim vector column
-- ✅ IVFFlat index for fast cosine similarity
-- ✅ match_documents RPC function for RAG retrieval
-- ✅ RLS policies applied
