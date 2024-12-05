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

  await client.query("INSERT INTO tbfavouritelist (userid, movieid, episodenumber, createddate) VALUES ($1, $2, $3, $4)", [
    req.user.userid,
    params.movieid,
    params.episodenumber,
    getStringDatetimeNow(),
  ]);
  sendResponse(res, 200, "success", "success", "Đã thêm vào danh sách yêu thích");
});

export const removeFavouriteEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.deleteFavouriteEpisodeCommentParams);

  await client.query("DELETE FROM tbfavouritelist WHERE userid = $1 AND movieid = $2 AND episodenumber = $3", [
    req.user.userid,
    params.movieid,
    params.episodenumber,
  ]);

  sendResponse(res, 200, "success", "success", "Đã xóa khỏi danh sách yêu thích");
});

export const getUserFavouriteList = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query("SELECT * FROM tbfavouritelist where userid = $1  LIMIT $1 OFFSET $2", [req.user.userid, size, offset]);

  sendResponse(res, 200, "success", "success", result);
});

export const checkIfFavourite = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.checkFavouriteEpisodeParams);
  const result = await client.query("SELECT 1 FROM tbfavouritelist where userid = $1 and movieid = $2 and episodenumber = $3", [
    req.user.userid,
    params.movieid,
    params.episodenumber,
  ]);
  sendResponse(res, 200, "success", "success", result.rows);
});
