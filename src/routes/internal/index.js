import { Router } from "express";
import movieRoutes from "./movieRou.js";
import episodeRoutes from "./episodeRou.js";
import accountRoutes from "./accountRou.js";

const router = Router();

router.use("/movie/", movieRoutes);
router.use("/episode/", episodeRoutes);
router.use("/account/", accountRoutes);

export default router;
