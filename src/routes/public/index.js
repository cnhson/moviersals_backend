import { Router } from "express";
import * as accountCon from "../../controller/accountCon.js";
import * as movieCon from "../../controller/movieCon.js";
import * as subcriptionCon from "../../controller/subcriptionCon.js";
import * as orderCon from "../../controller/orderCon.js";
import * as commentCon from "../../controller/commentCon.js";

const router = Router();

// Account
router.post("/login", accountCon.loginAccount);
router.post("/create", accountCon.createAccount);
router.post("/createResetPasswordToken", accountCon.createResetPasswordToken);
router.post("/checkResetPasswordToken", accountCon.checkResetPasswordToken);
router.post("/confirmResetPassword", accountCon.verifyResetPassword);

// Movie
router.get("/movie/getAll", movieCon.getMovieList);
router.get("/movie/detail/:movieid", movieCon.getMovieDetail);

// Comment
router.get("/comment/getAll/:movieid", commentCon.getAllComments);

// Subcripiton
router.get("/subcription/getAll", subcriptionCon.getAllSubcriptionPlan);

// VNpay redirect
router.get("/vnpay/ipn", orderCon.hanldeVNPayIPN);

// Categories
router.get("/movie/getCategories", movieCon.getCategories);

export default router;
