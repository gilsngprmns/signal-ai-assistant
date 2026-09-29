import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import * as contexts from "../controllers/context.controller.js";
import requireAuth from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/dashboard", admin.dashboard);
router.get("/users", admin.users);
router.get("/users/:id", admin.userById);
router.patch("/users/:id", admin.patchUser);
router.patch("/users/:id/role", admin.patchUser);
router.patch("/users/:id/status", admin.patchUser);
router.delete("/users/:id", admin.deleteUser);
router.get("/conversations", admin.conversations);
router.delete("/conversations/:id", admin.deleteConversation);
router.get("/contexts", contexts.list);
router.post("/contexts", contexts.create);
router.get("/contexts/:id", contexts.getById);
router.patch("/contexts/:id", contexts.update);
router.delete("/contexts/:id", contexts.remove);
router.get("/ai-settings", admin.aiSettings);
router.patch("/ai-settings", admin.patchAiSettings);
router.get("/usage", admin.usage);
router.get("/activity-logs", admin.activity);

export default router;