import {
  sendResponse,
  getStringDatetimeNow,
  errorHandler,
  preProcessingBodyParam,
  getQueryOffset,
  getPageSize,
  getTotalPages,
} from "../util/index.js";
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
    `WITH base_data AS (
      SELECT t.id, t2.movieid, t2.name AS moviename, t2.publisher, t2.publishyear, t2.type, t2.thumbnail,
            t3.episodeid, t3.episodenumber, t3.name AS episodename, t.createddate
      FROM tbfavouritelist t
      JOIN tbmovieinfo t2 ON t.movieid = t2.movieid
      JOIN tbmovieepisode t3 ON t.episodenumber = t3.episodenumber AND t2.movieid = t3.movieid
      WHERE t.userid = $1
    ),
    total AS (
      SELECT COUNT(*) AS total_count FROM base_data
    ),
    data AS (
      SELECT * FROM base_data
      LIMIT $2 OFFSET $3
    )
    SELECT (SELECT total_count FROM total) AS total_count, json_agg(data) AS rows
    FROM data;
    `,
    [req.user.userid, size, offset]
  );

  const totalPagges = getTotalPages(result.rows[0].total_count);
  const object = { list: result.rows[0].rows, total: totalPagges };

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
