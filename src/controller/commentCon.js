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
import { commentSchema } from "../schema/index.js";

export const createComment = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, commentSchema.createCommentParams);

  const check = client.query("select 1 from tbmoviecomment t where t.userid = $1 and t.movieid = $2 and t.isactive = true", [
    req.user.userid,
    params.movieid,
  ]);

  if (check.rowCount == 1) return sendResponse(res, 200, "success", "error", "You have already commented");

  await client.query("Insert into tbmoviecomment (movieid, userid, content, createddate, rating) VALUES ($1, $2, $3, $4, $5)", [
    params.movieid,
    req.user.userid,
    params.content,
    getStringDatetimeNow(),
    params.rating,
  ]);

  sendResponse(res, 200, "success", "success", "Add comment successfully");
});

export const editComment = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, commentSchema.editCommentParams);

  await client.query(
    "UPDATE tbmoviecomment SET content = $4, rating = $5, modifieddate = $6  WHERE userid = $1 and movieid = $2 and id = $3",
    [req.user.userid, params.movieid, params.id, params.content, params.rating, getStringDatetimeNow()]
  );

  sendResponse(res, 200, "success", "success", "Edit comment successfully");
});

export const removeComment = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, commentSchema.editCommentParams);

  await client.query("UPDATE tbmoviecomment SET isactive = false, modifieddate = $4  WHERE userid = $1 and movieid = $2 and id = $3", [
    req.user.userid,
    params.movieid,
    params.id,
    getStringDatetimeNow(),
  ]);
});

export const getAllComments = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const userid = req.query.userid || "";
  const movieid = req.params.movieid;
  const result = await client.query(
    `
      SELECT t.*,t2.username, t2.displayname, t2.thumbnail 
      FROM tbmoviecomment t
      join tbuserinfo t2
      on t.userid = t2.id::text 
      where t.movieid = $4 and t.isactive = true
      ORDER BY 
      CASE WHEN userid = $1 THEN 0 ELSE 1 end
      LIMIT $2 OFFSET $3 `,
    [userid, size, offset, movieid]
  );
  sendResponse(res, 200, "success", "success", result.rows);
});
