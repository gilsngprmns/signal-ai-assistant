import { Router } from "express";
import {
  create,
  getById,
  getMessages,
  list,
  remove,
  update,
} from "../controllers/conversation.controller.js";
import { regenerateMessage, sendMessage, streamMessage } from "../controllers/chat.controller.js";
import requireAuth from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();
const aiRequestLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: "Too many AI requests. Please wait a moment and try again." });

router.use(requireAuth);
router.post("/", create);
router.get("/", list);
router.get("/:id/messages", getMessages);
router.post("/:id/messages/stream", aiRequestLimiter, streamMessage);
router.post("/:id/messages", aiRequestLimiter, sendMessage);
router.post("/:id/messages/regenerate", aiRequestLimiter, regenerateMessage);
router.patch("/:id", update);
router.get("/:id", getById);
router.delete("/:id", remove);

export default router;