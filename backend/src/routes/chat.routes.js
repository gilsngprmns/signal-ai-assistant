import { Router } from "express";
import { chat, chatConfig } from "../controllers/chat.controller.js";
import requireAuth from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();
const aiRequestLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: "Too many AI requests. Please wait a moment and try again." });

router.get("/config", requireAuth, chatConfig);
router.post("/", requireAuth, aiRequestLimiter, chat);

export default router;
