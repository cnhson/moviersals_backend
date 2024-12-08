import {
  sendResponse,
  getStringDatetimeNow,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
  getReqIpAddress,
} from "../util/index.js";
import { episodeSchema } from "../schema/index.js";

export const uploadEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.uploadEpisode_Params);
  const createdDateTime = getStringDatetimeNow();
  const episodeid = params.movieid + "_" + params.episodenumber;
  await client.query(
    "INSERT INTO tbmovieepisode (movieid, episodeid, name, episodenumber,episodepath, createddate) VALUES ($1, $2, $3, $4, $5, $6)",
    [params.movieid, episodeid, params.name, params.episodenumber, params.episodepath, createdDateTime]
  );
  return sendResponse(res, 200, "success", "success", "Upload tập phim thành công");
});

export const editEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.editEpisode_Params);
  await client.query("UPDATE tbmovieepisode SET episodepath = $2 WHERE movieid = $1 and episodenumber = $3", [
    params.movieid,
    params.episodepath,
    params.episodenumber,
  ]);
  return sendResponse(res, 200, "success", "success", "Sửa tập phim thành công");
});

export const deleteEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.deleteEpisode_Params);
  await client.query("DELETE from tbmovieepisode where movieid = $1 and episodeid = $2 and episodenumber = $3", [
    params.movieid,
    params.episodeid,
    params.episodenumber,
  ]);
  return sendResponse(res, 200, "success", "success", "Xóa tập phim thành công");
});

export const increaseEpisodeView = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.increaseEpisodeViewParams);
  const userid = req.user.userid;
  const ipaddress = getReqIpAddress(req);
  const check = await client.query("Select episodeid from tbmovieepisode t where t.movieid = $1 and t.episodenumber = $2", [
    params.movieid,
    params.episodenumber,
  ]);
  if (check.rowCount === 1) {
    const createddate = getStringDatetimeNow();
    const episodeid = check.rows[0].episodeid;
    const result = await client.query(
      "INSERT INTO tbwatchhistory (userid, movieid, episodeid, ipaddress, createddate) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
      [userid, params.movieid, episodeid, ipaddress, createddate]
    );
    if (result.rowCount === 1) {
      await client.query("UPDATE tbmovieepisode SET view = view + 1, modifieddate = $3 WHERE episodeid = $1 and movieid = $2", [
        episodeid,
        params.movieid,
        createddate,
      ]);
    }
    sendResponse(res, 200, "success", "success", "Đã tăng lượt xem cho tập phim");
  } else sendResponse(res, 200, "success", "error", "Tập phim không tồn tại");
});
