import { Router } from "express";
import * as funcs from "../../controller/movieCon.js";
import movieRoutes from "./movieRou.js";
const router = Router();

router.use("/movie/", movieRoutes);

export default router;