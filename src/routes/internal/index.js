import { Router } from "express";
import { multerType } from "../../middleware/multer.js";
import * as movieCon from "../../controller/movieCon.js";
import * as accountCon from "../../controller/accountCon.js";
import * as episodeCon from "../../controller/episodeCon.js";
import * as livestreamCon from "../../controller/livestreamCon.js";
import * as orderCon from "../../controller/orderCon.js";
import * as subcriptionCon from "../../controller/subcriptionCon.js";

const router = Router();

// Account
router.get("/account/getAllUser", accountCon.getAllUser_);
router.post("/account/updateState", accountCon.changeAccountState);

// Episode
router.post("/episode/upload", episodeCon.uploadEpisode_);
router.post("/episode/edit", episodeCon.editEpisode_);

// Movie
router.post("/movie/testupload", multerType("thumbnail"), movieCon.testUploadImage_);
router.post("/movie/upload", multerType("thumbnail"), movieCon.createMovieInfo_);
router.post("/movie/edit", multerType("thumbnail"), movieCon.editMovieInfo_);
router.post("/movie/delete", movieCon.deleteMovieInfo_);
router.get("/movie/get/:movieid", movieCon.getMovieAllEpisodes_);

// Livestream

router.post("/livestream/create", livestreamCon.createLivestream_);
router.post("/livestream/edit", livestreamCon.editLivestream_);

// Order
router.get("/order/getAll", orderCon.getAllOrders_);

// Subcription
router.post("/subcription/create", subcriptionCon.createSubcriptionPlan_);
router.post("/subcription/edit", subcriptionCon.editSubcriptionPlan_);

export default router;
