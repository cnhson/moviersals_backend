import bcrypt from "bcryptjs";
import moment from "../../node_modules/moment/moment.js";
import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
  getQueryOffset,
  getPageSize,
} from "../util/index.js";
import { sendEmail } from "../services/mailer.js";
import { favouriteSchema } from "../schema/index.js";

export const addFavouriteEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.addFavouriteEpisodeParams);
  if (!req.user.userid) return sendResponse(res, 200, "success", "error", "Hãy đăng nhập trước khi thực hiện hành động này");

  await client.query("INSERT INTO tbfavouritelist (userid, movieid, episodeid, createddate) VALUES ($1, $2, $3, $4)", [
    req.user.userid,
    params.movieid,
    params.episodeid,
    getStringDatetimeNow(),
  ]);
  sendResponse(res, 200, "success", "success", "Add comment successfully");
});

export const removeFavouriteEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.deleteFavouriteEpisodeCommentParams);

  await client.query("DELETE FROM tbfavouritelist WHERE userid = $1 AND movieid = $2 AND episodeid = $3 and id = $4", [
    req.user.userid,
    params.movieid,
    params.episodeid,
    params.id,
  ]);

  sendResponse(res, 200, "success", "success", "Delete comment successfully");
});

export const getUserFavouriteList = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query("SELECT * FROM tbfavouritelist where userid = $1  LIMIT $1 OFFSET $2", [req.user.userid, size, offset]);

  sendResponse(res, 200, "success", "success", result);
});

export const checkIfFavourite = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.checlFavouriteEpisodeParams);
  const result = await client.query("SELECT 1 FROM tbfavouritelist where userid = $1 and movieid = $2 and episodeid = $3", [
    req.user.userid,
    params.movieid,
    params.episodeid,
  ]);
  sendResponse(res, 200, "success", "success", result.rows);
});
