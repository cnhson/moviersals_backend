import { Router } from "express";
import * as funcs from "../../controller/accountCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/edit", multerType("thumbnail", false), funcs.editAccountInfo);
router.post("/createEmailVerification", funcs.createEmailVerification);
router.post("/changepassword", funcs.changePassword);
router.post("/logout", funcs.logoutAccount);
router.post("/verifyEmail", funcs.verifyEmail);
export default router;
