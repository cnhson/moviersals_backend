import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/upload", multerType("thumbnail"), funcs.createMovieInfo);
router.post("/edit", multerType("thumbnail"), funcs.editMovieInfo);
router.post("/delete", funcs.deleteMovieInfo);
router.post("/testupload", multerType("image"), funcs.uploadImage);

export default router;
