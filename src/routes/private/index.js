import { Router } from "express";
// router.use("/accounts", users);
import * as funcs from "../../controller/accountCon.js";
import { authenticateJWT } from "../../middleware/jwtverify.js";

const router = Router();
router.post("/logout", funcs.logoutAccount);
router.post("/changepassword", authenticateJWT, funcs.changePassword);

export default router;
