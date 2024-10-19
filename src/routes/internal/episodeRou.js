import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/upload", multerType("video"), funcs.uploadEpisode);

export default router;
