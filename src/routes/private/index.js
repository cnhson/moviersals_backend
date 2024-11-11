import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";
import { authenticateJWT } from "../../middleware/index.js";

const router = Router();
router.post("/logout", funcs.logoutAccount);
router.post("/changepassword", authenticateJWT, funcs.changePassword);
router.post("/createEmailVerification", authenticateJWT, funcs.createEmailVerification);
router.post("/verifyEmail", authenticateJWT, funcs.verifyEmail);
router.get("/getCurrentUser", authenticateJWT, funcs.getCurrentUser);

export default router;
