import { Router } from "express";
import { multerType } from "../../middleware/multer.js";
import * as movieCon from "../../controller/movieCon.js";
import * as accountCon from "../../controller/accountCon.js";
import * as episodeCon from "../../controller/episodeCon.js";
import * as livestreamCon from "../../controller/livestreamCon.js";

const router = Router();

// Account
router.get("/account/getAllUser", accountCon.getAllUser_);

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

router.post("/livestream/create", multerType("thumbnail"), livestreamCon.createLivestream_);
router.post("/livestream/edit", multerType("thumbnail"), livestreamCon.editLivestream_);

// Cloudinary

export default router;
