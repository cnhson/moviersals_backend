import { Router } from "express";
import { multerType } from "../../middleware/multer.js";
import * as accountCon from "../../controller/accountCon.js";
import * as episodeCon from "../../controller/episodeCon.js";
import * as orderCon from "../../controller/orderCon.js";
import * as movieCon from "../../controller/movieCon.js";
import * as commentCon from "../../controller/commentCon.js";
import * as favouriteCon from "../../controller/favouriteCon.js";

const router = Router();

router.get("/checkAuthen", accountCon.checkAuthenciation);

// Account
router.post("/account/edit", multerType("thumbnail", false), accountCon.editAccountInfo);
router.post("/account/createEmailVerification", accountCon.createEmailVerification);
router.post("/account/changepassword", accountCon.changePassword);
router.post("/account/logout", accountCon.logoutAccount);
router.post("/account/verifyEmail", accountCon.verifyEmail);

// Episode
router.get("/movie/watch/:movieid/:episodeid", movieCon.getMovieEpisode);
router.post("/episode/increaseview", episodeCon.increaseEpisodeView);

// Paypal
router.post("/order/create/paypal", orderCon.createPaypalOrder);
router.post("/order/getDetail", orderCon.getOrderPaymentDetail);
router.get("/order/history", orderCon.getOrderHistory);

// VNPay
router.post("/order/create/vnpay", orderCon.createVNPayTransaction);

// Comment
router.post("/comment/create", commentCon.createComment);
router.post("/comment/edit", commentCon.editComment);
router.post("/comment/delete", commentCon.removeComment);

// Favourite
router.get("/favourite/get", favouriteCon.getUserFavouriteList);
router.post("/favourite/add", favouriteCon.addFavouriteEpisode);
router.post("/favourite/delete", favouriteCon.removeFavouriteEpisode);

export default router;
