import { Router } from "express";
import { getMe, loginUser, registerUser } from "../controllers/auth.controller.js";
import requireAuth from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many sign-in attempts. Try again later." });
const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: "Too many account creation attempts. Try again later." });

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.get("/me", requireAuth, getMe);

export default router;
