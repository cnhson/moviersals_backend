import { Router } from "express";
import * as funcs from "../../controller/episodeCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/upload", multerType("video"), funcs.uploadEpisode_);

export default router;
