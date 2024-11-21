import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";
import accountRoutes from "./accountRou.js";
import episodeRoutes from "./episodeRou.js";

const router = Router();

router.post("/verifyEmail", funcs.verifyEmail);
router.get("/checkAuthen", funcs.checkAuthenciation);
router.use("/account", accountRoutes);
router.use("/episode", episodeRoutes);

export default router;
