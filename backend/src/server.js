import "dotenv/config";

import app from "./app.js";
import pool from "./config/database.js";
import { isGeminiConfigured } from "./config/gemini.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected");
    console.log("Database time:", result.rows[0].now);

    if (!isGeminiConfigured()) {
      console.warn(
        "GEMINI_API_KEY is not configured; document processing and AI chat are unavailable"
      );
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log("=================================");
      console.log("AI Knowledge Base Backend");
      console.log(`Server running on port ${PORT}`);
      console.log("=================================");
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL");
    console.error(error.message);

    process.exit(1);
  }
}

startServer();