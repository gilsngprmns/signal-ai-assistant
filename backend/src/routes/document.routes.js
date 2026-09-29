import { Router } from "express";

const router = Router();

router.use((req, res) => {
	return res.status(410).json({ success: false, message: "Legacy document routes are disabled in this backend build." });
});

export default router;
