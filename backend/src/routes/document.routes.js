import { Router } from "express";
import { create, getById, list, openFile, remove } from "../controllers/document.controller.js";
import requireAuth from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/", upload.single("file"), create);
router.get("/", list);
router.get("/:id/file", openFile);
router.get("/:id", getById);
router.delete("/:id", remove);

export default router;
