ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536);