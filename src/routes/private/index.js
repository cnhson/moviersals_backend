import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";
import accountRoutes from "./accountRou.js";

const router = Router();

router.post("/verifyEmail", funcs.verifyEmail);
router.get("/checkAuthen", funcs.checkAuthenciation);
router.use("/account", accountRoutes);

export default router;
