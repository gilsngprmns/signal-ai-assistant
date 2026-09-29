import express from "express";
import cors from "cors";

import pool from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { GEMINI_EMBEDDING_DIMENSIONS, isGeminiConfigured } from "./config/gemini.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", database: "connected" });
  } catch {
    return res.status(503).json({ status: "unavailable", database: "disconnected" });
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "AI Knowledge Base API is running" });
});

app.get("/api/health", (req, res) => {
  const healthQuery = `
    SELECT
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_extension,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'document_chunks'
          AND column_name = 'embedding'
          AND udt_name = 'vector'
      ) AS embedding_column,
      (
        SELECT format_type(attribute.atttypid, attribute.atttypmod)
        FROM pg_attribute AS attribute
        JOIN pg_class AS relation ON relation.oid = attribute.attrelid
        JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = 'document_chunks'
          AND attribute.attname = 'embedding'
          AND NOT attribute.attisdropped
      ) AS embedding_vector_type,
      (
        SELECT jsonb_object_agg(table_name || '.' || column_name, data_type)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (
            ('users', 'id'), ('documents', 'id'), ('documents', 'user_id'),
            ('document_chunks', 'document_id'), ('conversations', 'id'),
            ('conversations', 'user_id'), ('messages', 'conversation_id')
          )
      ) AS id_types
  `;
  const missingColumnsQuery = `
    SELECT required.table_name || '.' || required.column_name AS name
    FROM (VALUES
      ('users', 'id'), ('users', 'name'), ('users', 'email'), ('users', 'password_hash'), ('users', 'role'), ('users', 'status'), ('users', 'last_login'), ('users', 'created_at'),
      ('documents', 'id'), ('documents', 'user_id'), ('documents', 'original_name'), ('documents', 'stored_name'),
      ('documents', 'file_type'), ('documents', 'file_size'), ('documents', 'status'), ('documents', 'created_at'),
      ('document_chunks', 'document_id'), ('document_chunks', 'chunk_index'), ('document_chunks', 'content'),
      ('document_chunks', 'page_number'), ('document_chunks', 'embedding'),
        ('conversations', 'id'), ('conversations', 'user_id'), ('conversations', 'title'), ('conversations', 'mode'),
      ('conversations', 'created_at'), ('conversations', 'updated_at'),
      ('messages', 'conversation_id'), ('messages', 'role'), ('messages', 'content'), ('messages', 'sources'),
      ('messages', 'client_message_id'), ('messages', 'created_at'),
      ('ai_context_labels', 'id'), ('ai_context_labels', 'name'), ('ai_context_labels', 'slug'),
      ('ai_context_labels', 'category'), ('ai_context_labels', 'context_prompt'), ('ai_context_labels', 'keywords'),
      ('ai_settings', 'id'), ('ai_settings', 'default_mode'), ('ai_settings', 'ai_enabled'),
      ('ai_usage_logs', 'id'), ('ai_usage_logs', 'user_id'), ('ai_usage_logs', 'total_tokens'), ('ai_usage_logs', 'ttft_ms'), ('ai_usage_logs', 'status'),
      ('admin_activity_logs', 'id'), ('admin_activity_logs', 'admin_id'), ('admin_activity_logs', 'action')
    ) AS required(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns AS actual
      WHERE actual.table_schema = 'public'
        AND actual.table_name = required.table_name
        AND actual.column_name = required.column_name
    )
    ORDER BY required.table_name, required.column_name
  `;

  Promise.all([pool.query(healthQuery), pool.query(missingColumnsQuery)])
    .then(([{ rows }, { rows: missingRows }]) => {
      const vectorStorage = rows[0];
      const missingColumns = missingRows.map((row) => row.name);
      const ready = vectorStorage.vector_extension &&
        vectorStorage.embedding_column &&
        vectorStorage.embedding_vector_type === `vector(${GEMINI_EMBEDDING_DIMENSIONS})` &&
        missingColumns.length === 0;
      res.status(ready ? 200 : 503).json({
        success: ready,
        status: ready ? "OK" : "SCHEMA_INCOMPLETE",
        database: "connected",
        vectorStorage,
        missingColumns,
        aiConfigured: isGeminiConfigured(),
        ...(!ready && { message: `Database schema is incomplete; apply pending migrations including 007_admin_platform.sql and 008_chat_performance.sql and ensure document_chunks.embedding is vector(${GEMINI_EMBEDDING_DIMENSIONS})` }),
      });
    })
    .catch((error) => {
      console.error("Health check database query failed:", error);
      res.status(503).json({ success: false, status: "UNAVAILABLE", database: "disconnected" });
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

export default app;