ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

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

INSERT INTO ai_context_labels (name, slug, category, description, context_prompt, keywords, priority)
VALUES
  ('Email Infrastructure', 'email-infrastructure', 'IT', 'Email hosting, delivery, DNS records, and mail-client troubleshooting.', 'You specialize in email infrastructure. Focus on SMTP, IMAP, DNS, MX, SPF, DKIM, DMARC, email deliverability, Outlook, mail hosting, migration, archiving, and troubleshooting.', ARRAY['smtp', 'imap', 'mx', 'spf', 'dkim', 'dmarc', 'outlook', 'email', 'mail server'], 20),
  ('Network Troubleshooting', 'network-troubleshooting', 'IT', 'Network connectivity, DNS, routing, and diagnostic workflows.', 'You specialize in practical network troubleshooting. Focus on DNS, routing, connectivity, TCP/IP, Wi-Fi, firewalls, and sequential diagnostics.', ARRAY['dns', 'network', 'wifi', 'routing', 'tcp', 'ip address', 'connectivity'], 15),
  ('Web Development', 'web-development', 'IT', 'Frontend, backend, APIs, and web application development.', 'You specialize in web development. Give practical, secure guidance for frontend, backend, HTTP APIs, browser behavior, and application architecture.', ARRAY['react', 'javascript', 'frontend', 'backend', 'api', 'http', 'web development'], 10),
  ('Cybersecurity', 'cybersecurity', 'IT', 'Defensive security engineering and incident response.', 'You specialize in defensive cybersecurity. Prioritize threat modeling, secure configuration, incident response, and responsible remediation.', ARRAY['security', 'cybersecurity', 'vulnerability', 'incident response', 'malware', 'phishing'], 10),
  ('Database', 'database', 'IT', 'Relational database design, SQL, performance, and operations.', 'You specialize in database engineering. Focus on schema design, SQL correctness, indexes, transactions, backups, and measured performance diagnosis.', ARRAY['postgres', 'postgresql', 'sql', 'database', 'query', 'index', 'migration'], 9),
  ('DevOps', 'devops', 'IT', 'Deployment, CI/CD, infrastructure, and operations.', 'You specialize in DevOps and platform engineering. Focus on repeatable deployment, observability, CI/CD, infrastructure reliability, and safe operations.', ARRAY['devops', 'deployment', 'docker', 'ci/cd', 'pipeline', 'server', 'cloud'], 8),
  ('Shoegaze', 'shoegaze', 'Music', 'Shoegaze guitar tone, arrangement, and production.', 'You specialize in shoegaze music. Explain practical approaches to layered guitars, reverb, modulation, fuzz, arrangement, recording, and mix clarity.', ARRAY['shoegaze', 'fuzz', 'reverb', 'guitar tone', 'dream pop', 'wall of sound'], 12),
  ('Music Production', 'music-production', 'Music', 'Recording, mixing, songwriting, and sound design.', 'You specialize in music production. Give practical guidance on recording, arrangement, mixing, mastering, songwriting, and sound design.', ARRAY['mixing', 'mastering', 'recording', 'songwriting', 'music production', 'sound design'], 8)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS ai_context_labels_active_priority_idx
  ON ai_context_labels (is_active, priority DESC);

CREATE TABLE IF NOT EXISTS ai_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_mode VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (default_mode IN ('general', 'it', 'music')),
  global_system_prompt TEXT NOT NULL DEFAULT '',
  max_history_messages INTEGER NOT NULL DEFAULT 20 CHECK (max_history_messages BETWEEN 1 AND 40),
  max_active_contexts INTEGER NOT NULL DEFAULT 3 CHECK (max_active_contexts BETWEEN 0 AND 3),
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.65 CHECK (temperature BETWEEN 0 AND 2),
  max_output_tokens INTEGER NOT NULL DEFAULT 1600 CHECK (max_output_tokens BETWEEN 64 AND 8192),
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  model_identifier VARCHAR(120) NOT NULL DEFAULT 'gemini-3.8-flash',
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
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  error_code VARCHAR(80),
  contexts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_created_at_idx ON ai_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_user_id_idx ON ai_usage_logs (user_id);

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

CREATE INDEX IF NOT EXISTS admin_activity_logs_created_at_idx ON admin_activity_logs (created_at DESC);