import { Router } from "express";
import {
  create,
  getById,
  getMessages,
  list,
  remove,
  update,
} from "../controllers/conversation.controller.js";
import { regenerateMessage, sendMessage } from "../controllers/chat.controller.js";
import requireAuth from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/", create);
router.get("/", list);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", sendMessage);
router.post("/:id/messages/regenerate", regenerateMessage);
router.patch("/:id", update);
router.get("/:id", getById);
router.delete("/:id", remove);

export default router;