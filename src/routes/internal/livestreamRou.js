import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/create", multerType("thumbnail"), funcs.createMovieInfo_);
router.post("/edit", multerType("thumbnail"), funcs.editMovieInfo_);
router.post("/end", funcs.deleteMovieInfo_);
router.post("/increase", funcs.deleteMovieInfo_);

export default router;
