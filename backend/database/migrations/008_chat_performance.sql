ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_client_message_idx
  ON messages (conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC, id DESC);
DROP INDEX IF EXISTS messages_conversation_id_idx;

CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
  ON conversations (user_id, updated_at DESC);
DROP INDEX IF EXISTS conversations_user_id_idx;

ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS ttft_ms INTEGER;

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON ai_usage_logs (user_id, created_at DESC);
DROP INDEX IF EXISTS ai_usage_logs_user_id_idx;

ALTER TABLE ai_settings
  ALTER COLUMN max_history_messages SET DEFAULT 12,
  ALTER COLUMN max_output_tokens SET DEFAULT 1200,
  ALTER COLUMN model_identifier SET DEFAULT 'gemini-flash-latest';

UPDATE ai_settings SET model_identifier = 'gemini-flash-latest'
WHERE model_identifier = 'gemini-3.8-flash' AND updated_by IS NULL;

UPDATE ai_settings SET max_output_tokens = 1200
WHERE max_output_tokens = 1600 AND updated_by IS NULL;

UPDATE ai_settings SET max_history_messages = 12
WHERE max_history_messages = 20 AND updated_by IS NULL;