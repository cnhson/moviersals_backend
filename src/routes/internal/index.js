import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../services/multer.js";
const router = Router();

router.post("/upload", multerType, funcs.uploadMovie);
router.post("/edit", multerType, funcs.editMovie);
router.post("/testupload", multerType, funcs.uploadImage);

export default router;
