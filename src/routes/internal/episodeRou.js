import { Router } from "express";
import * as funcs from "../../controller/episodeCon.js";

const router = Router();

router.post("/upload", funcs.uploadEpisode_);
router.post("/edit", funcs.editEpisode_);

export default router;
