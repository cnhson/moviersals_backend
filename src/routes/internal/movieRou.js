import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/upload", multerType("thumbnail"), funcs.createMovieInfo_);
router.post("/edit", multerType("thumbnail"), funcs.editMovieInfo_);
router.post("/delete", funcs.deleteMovieInfo_);
router.post("/testupload", multerType("thumbnail"), funcs.uploadImage_);

export default router;
