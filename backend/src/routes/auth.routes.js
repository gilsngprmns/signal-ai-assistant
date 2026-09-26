import { Router } from "express";
import { getMe, loginUser, registerUser } from "../controllers/auth.controller.js";
import requireAuth from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, getMe);

export default router;
