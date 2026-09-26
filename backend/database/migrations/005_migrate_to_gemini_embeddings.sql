DO $$
DECLARE
  current_embedding_type TEXT;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
  INTO current_embedding_type
  FROM pg_attribute AS attribute
  JOIN pg_class AS relation ON relation.oid = attribute.attrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'document_chunks'
    AND attribute.attname = 'embedding'
    AND NOT attribute.attisdropped;

  IF current_embedding_type IS NULL THEN
    ALTER TABLE public.document_chunks ADD COLUMN embedding vector(768);
  ELSIF current_embedding_type <> 'vector(768)' THEN
    ALTER TABLE public.document_chunks
      ALTER COLUMN embedding TYPE vector(768)
      USING NULL::vector(768);
  END IF;
END $$;