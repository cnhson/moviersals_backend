import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import movieRoutes from "./movieRou.js";
import episodeRoutes from "./episodeRou.js";

const router = Router();

router.use("/movie/", movieRoutes);
router.use("/episode/", episodeRoutes);

export default router;
