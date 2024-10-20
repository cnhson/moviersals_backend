import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
const router = Router();

router.get("/getAll", funcs.getMovieList);
router.get("/detail/:movieid", funcs.getMovieDetail);
router.get("/watch/:movieid/:episodeid", funcs.getMovieEpisode);
router.post("/filter", funcs.categoriesFilter);

export default router;
