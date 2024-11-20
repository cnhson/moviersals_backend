import { Router } from "express";
import movieRoutes from "./movieRou.js";
import episodeRoutes from "./episodeRou.js";
import accountRoutes from "./accountRou.js";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.use("/movie/", movieRoutes);
router.use("/episode/", episodeRoutes);
router.use("/account/", accountRoutes);
router.post("/testupload", multerType("thumbnail"), funcs.testUploadImage_);

export default router;
