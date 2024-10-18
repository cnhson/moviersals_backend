import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import { multerType } from "../../services/multer.js";
const router = Router();

router.get("/getAll", funcs.getMovieList);
router.get("/detail/:movieid", funcs.getMovieDetail);
router.get("/watch/:movieid/:episodeid", funcs.getMovieEpisode);
router.post("/upload", multerType, funcs.uploadImage);

export default router;
