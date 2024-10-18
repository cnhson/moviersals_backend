import { dbPool } from "../services/database.js";
import moment from "../../node_modules/moment/moment.js";
import * as funcs from "../global/index.js";
import { uploadCloudImage } from "../services/cloudinary.js";
const generateRandomString = funcs.generateRandomString;
const sendResponse = funcs.sendResponse;

export async function getMovieList(req, res) {
  const client = await dbPool.connect();
  try {
    const result = await client.query("SELECT id, name, thumbnail, publishyear, categories, type, ispremium FROM tbmovieinfo");
    const movieList = result.rows;
    sendResponse(res, 200, "success", movieList);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function getMovieDetail(req, res) {
  const client = await dbPool.connect();
  try {
    const { movieid } = req.params;
    const result = await client.query("SELECT * FROM tbmovie WHERE id = $1", [movieid]);
    const movieDetail = result.rows[0];
    sendResponse(res, 200, "success", movieDetail);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function getMovieEpisode(req, res) {
  const client = await dbPool.connect();
  try {
    const { movieid, episodeid } = req.params;
    const result = await client.query("SELECT * FROM tbmovieepisode WHERE movieid = $1 and episodeid = $2", [movieid, episodeid]);
    const movieEpisode = result.rows;
    sendResponse(res, 200, "success", movieEpisode);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return sendResponse(res, 200, "fail", "No file uploaded");
    }
    const imageFile = req.file;
    const imageUrl = await uploadCloudImage(imageFile);
    sendResponse(res, 200, "success", imageUrl);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  }
}
