-- Hosted-only pgvector sketch for the future FastAPI deployment.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE lost_pet_reports
  ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS lost_pet_reports_embedding_hnsw_idx
  ON lost_pet_reports USING hnsw (embedding vector_cosine_ops);
