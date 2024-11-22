import { Router } from "express";
import * as accountCon from "../../controller/accountCon.js";
import * as episodeCon from "../../controller/episodeCon.js";
import { multerType } from "../../middleware/multer.js";

const router = Router();

router.post("/verifyEmail", accountCon.verifyEmail);
router.get("/checkAuthen", accountCon.checkAuthenciation);

// Account
router.post("/account/edit", multerType("thumbnail", false), accountCon.editAccountInfo);
router.post("/account/createEmailVerification", accountCon.createEmailVerification);
router.post("/account/changepassword", accountCon.changePassword);
router.post("/account/logout", accountCon.logoutAccount);
router.post("/account/verifyEmail", accountCon.verifyEmail);

// Episode
router.post("/episode/increaseview", episodeCon.increaseEpisodeView);

export default router;
