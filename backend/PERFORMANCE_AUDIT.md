# Chat Performance Audit

## Verified Request Path

The normal frontend sends `POST /api/conversations/:id/messages`. Express runs JWT authentication (including a database user/status/role lookup), validates the conversation ID and message, then the chat service checks conversation ownership, reads AI settings, inserts the user message, updates the new-conversation title, loads recent history, resolves active context labels, and calls Gemini once with `generateContent()`. The service waits for the complete Gemini response, waits for usage-log persistence, inserts the assistant message, and returns JSON. No vector search, document query, title-generation call, or Gemini classifier is on this path.

The backend reuses one module-scoped `pg.Pool`. History is selected by descending timestamp/id with a SQL limit and restored to chronological order. The current default is 20 messages plus a 40,000-character cap. Context resolution queries every active label on every message. AI settings are queried per message. Gemini retries up to four attempts (original plus three retries) with 500ms, 1s, and 2s base delays plus jitter. Usage logging is awaited before assistant persistence/response. New-chat title update is an extra awaited database update.

The installed `@google/genai` version is 2.24.0. Its local declaration documents `models.generateContentStream()` returning an `AsyncGenerator<GenerateContentResponse>` and `config.abortSignal`; the SDK notes abort is client-side and may not cancel provider-side work or charges.

## Before Baseline

`GET /api/health` returned `status: OK` and `database: connected`. A short end-to-end chat probe then returned `502`; the following cleanup/health probe got `ERR_CONNECTION_REFUSED`. No successful pre-change chat timing or provider TTFT is available, and no timing values are inferred from that failed request. Re-run the instrumented request after the backend is running to obtain comparable stage timings.

## Likely Critical-Path Costs

- Full-response Gemini generation prevents progressive rendering; provider generation is likely the dominant wait, but current observations do not establish its duration.
- Settings and all active labels are fetched repeatedly despite changing infrequently.
- Conversation title update and usage-log insert are awaited on the response path.
- Current retries permit three retries and potentially several seconds of backoff.
- Authentication intentionally performs a DB lookup per protected request so role/status changes apply immediately.

## Changes To Measure

Track auth, ownership read, user-message persistence, settings/history/context, Gemini TTFT and total generation, assistant persistence, usage persistence, and total request duration. Compare only successful requests with comparable prompts and provider conditions. Streaming should improve first visible text; it does not necessarily reduce Gemini total generation time.

## Implemented Optimizations

- Added `POST /api/conversations/:id/messages/stream` using the installed SDK 2.24.0 `generateContentStream()` API. SSE emits a durable user-message event, text chunks, final persisted assistant result, or a safe error. The old JSON endpoint remains for compatibility.
- Added UUID idempotency for streamed user messages (migration 008), so a repeated request with the same key does not start a second Gemini generation.
- Added separate Gemini TTFT and generation durations. Enable `ENABLE_PERF_LOGGING=true` to emit `[CHAT PERF]` stage summaries. No message content or secrets are included.
- Limited history to 12 messages / 24,000 characters by default; user input defaults to 12,000 characters; response output defaults to 1,200 tokens. These are configurable in `.env.example`.
- Cached active contexts (60 seconds) and settings (30 seconds), coalesced concurrent cache fills, and invalidated immediately after successful admin writes.
- Reads of settings and recent history/context matching are independent after user-message persistence; history and context now run concurrently.
- New conversation title update and usage telemetry no longer block first visible text/response completion; failures are handled as background task errors.
- Retries are limited to two retries, transient statuses only, with jitter and a bounded `Retry-After` delay. SDK `abortSignal` is used for stream cancellation, disconnect, and request timeout.
- Reused the existing PostgreSQL pool with bounded connection/query settings and one-statement message/timestamp persistence. Migration 008 adds composite indexes and replaces redundant single-column indexes.

## Measurement Status

The only pre-change live probe returned HTTP 502; a subsequent request found the local backend unavailable. Therefore there is no successful before/after Gemini timing pair yet. Do not interpret implementation defaults or expected targets as measured latency. After starting the backend with `ENABLE_PERF_LOGGING=true` and applying migrations through 008, compare actual `[CHAT PERF]` entries and Admin → Usage `TTFT`/`GENERATION` rows. Provider/network time remains unknown until a successful Gemini request is measured.
