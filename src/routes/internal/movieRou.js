import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/upload", multerType("thumbnail"), funcs.uploadMovie);
router.post("/edit", multerType("thumbnail"), funcs.editMovie);
router.post("/testupload", multerType("image"), funcs.uploadImage);

export default router;
