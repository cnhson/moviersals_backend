import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";

const router = Router();

router.get("/getAllUser", funcs.getAllUser_);

export default router;
