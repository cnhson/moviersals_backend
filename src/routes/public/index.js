import { Router } from "express";
// router.use("/accounts", users);
import * as funcs from "../../controller/accountCon.js";
import movieRoutes from "./movieRou.js";

const router = Router();
router.post("/login", funcs.loginAccount);
router.post("/create", funcs.createAccount);
router.use("/movie/", movieRoutes);

export default router;
