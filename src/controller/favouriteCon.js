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
  sendResponse(res, 200, "success", "success", "Thêm vào danh sách yêu thích");
});

export const removeFavouriteEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, favouriteSchema.deleteFavouriteEpisodeCommentParams);

  await client.query("DELETE FROM tbfavouritelist WHERE userid = $1 AND movieid = $2 AND episodenumber = $3", [
    req.user.userid,
    params.movieid,
    params.episodenumber,
  ]);

  sendResponse(res, 200, "success", "success", "Xóa khỏi danh sách yêu thích");
});

export const getUserFavouriteList = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query(
    `select t.id, t2.movieid, t2.name as moviename, t2.publisher, t2.publishyear, t2.type,
        t3.episodeid, t3.episodenumber, t3.name as episodename, t.createddate 
        from tbfavouritelist t 
        join tbmovieinfo t2 on t.movieid = t2.movieid
        join tbmovieepisode t3 on t.episodenumber = t3.episodenumber and t2.movieid = t3.movieid 
        where t.userid = $1 LIMIT $2 OFFSET $3`,
    [req.user.userid, size, offset]
  );

  const object = { "": result.row, size: size };

  sendResponse(res, 200, "success", "success", object);
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
