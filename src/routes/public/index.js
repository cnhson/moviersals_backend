import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";
import movieRoutes from "./movieRou.js";

const router = Router();
router.post("/login", funcs.loginAccount);
router.post("/create", funcs.createAccount);
router.post("/createResetPasswordToken", funcs.createResetPasswordToken);
router.post("/checkResetPasswordToken", funcs.checkResetPasswordToken);
router.post("/confirmResetPassword", funcs.verifyResetPassword);

router.use("/movie/", movieRoutes);

export default router;
