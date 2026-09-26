import { Router } from "express";
import { chat } from "../controllers/chat.controller.js";
import requireAuth from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, chat);

export default router;
