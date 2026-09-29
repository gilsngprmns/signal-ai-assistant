CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
	status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
	last_login TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	original_name TEXT NOT NULL,
	stored_name TEXT NOT NULL,
	file_type TEXT NOT NULL,
	file_size BIGINT NOT NULL,
	status TEXT NOT NULL DEFAULT 'uploaded',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
	id BIGSERIAL PRIMARY KEY,
	document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
	chunk_index INTEGER NOT NULL,
	content TEXT NOT NULL,
	page_number INTEGER,
	embedding vector(768),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS conversations (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL DEFAULT 'New conversation',
	mode VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'it', 'music')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
	id BIGSERIAL PRIMARY KEY,
	conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
	client_message_id UUID,
	role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
	content TEXT NOT NULL,
	sources JSONB NOT NULL DEFAULT '[]'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_client_message_idx ON messages(conversation_id, client_message_id) WHERE client_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_context_labels (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(120) NOT NULL,
	slug VARCHAR(140) NOT NULL UNIQUE,
	category VARCHAR(80) NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	context_prompt TEXT NOT NULL,
	keywords TEXT[] NOT NULL DEFAULT '{}',
	priority INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_settings (
	id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
	default_mode VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (default_mode IN ('general', 'it', 'music')),
	global_system_prompt TEXT NOT NULL DEFAULT '',
	max_history_messages INTEGER NOT NULL DEFAULT 12 CHECK (max_history_messages BETWEEN 1 AND 40),
	max_active_contexts INTEGER NOT NULL DEFAULT 3 CHECK (max_active_contexts BETWEEN 0 AND 3),
	temperature NUMERIC(3,2) NOT NULL DEFAULT 0.65 CHECK (temperature BETWEEN 0 AND 2),
	max_output_tokens INTEGER NOT NULL DEFAULT 1200 CHECK (max_output_tokens BETWEEN 64 AND 8192),
	ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	model_identifier VARCHAR(120) NOT NULL DEFAULT 'gemini-flash-latest',
	updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_usage_logs (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
	conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
	model VARCHAR(120) NOT NULL,
	mode VARCHAR(20),
	input_tokens INTEGER,
	output_tokens INTEGER,
	total_tokens INTEGER,
	response_time_ms INTEGER,
	ttft_ms INTEGER,
	status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
	error_code VARCHAR(80),
	contexts JSONB NOT NULL DEFAULT '[]'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
	id BIGSERIAL PRIMARY KEY,
	admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
	action VARCHAR(80) NOT NULL,
	target_type VARCHAR(80) NOT NULL,
	target_id VARCHAR(120),
	description TEXT NOT NULL,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx ON ai_usage_logs(user_id, created_at DESC);
