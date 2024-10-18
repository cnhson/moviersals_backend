import { Router } from "express";
// router.use("/accounts", users);
import * as funcs from "../../controller/accountCon.js";

const router = Router();
router.post("/login", funcs.loginAccount);
router.post("/create", funcs.createAccount);

export default router;
