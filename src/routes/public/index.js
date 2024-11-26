import { Router } from "express";
import * as accountCon from "../../controller/accountCon.js";
import * as movieCon from "../../controller/movieCon.js";
import * as subcriptionCon from "../../controller/subcriptionCon.js";

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
router.get("/movie/watch/:movieid/:episodeid", movieCon.getMovieEpisode);
router.post("/movie/filter", movieCon.categoriesFilter);

// Subcripiton

router.get("/subcription/getAll", subcriptionCon.getAllSubcriptionPlan);
export default router;
