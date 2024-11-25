import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
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
  return sendResponse(res, 200, "success", "success", "Upload movie's episode successfully");
});

export const editEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.editEpisode_Params);
  await client.query("UPDATE tbmovieepisode SET episodepath = $2 WHERE movieid = $1 and episodenumber = $3", [
    params.movieid,
    params.episodepath,
    params.episodenumber,
  ]);
  return sendResponse(res, 200, "success", "success", "Edit movie's episode successfully");
});

export const increaseEpisodeView = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.increaseEpisodeViewParams);
  const userid = req.user.userid;
  const ipaddress = getReqIpAddress(req);
  const check = await client.query("Select episodenumber from tbmovieepisode t where t.movieid = $1 and t.episodeid = $2", [
    params.movieid,
    params.episodeid,
  ]);
  if (check.rowCount === 1) {
    const createddate = getStringDatetimeNow();
    const result = await client.query(
      "INSERT INTO tbwatchhistory (userid, movieid, episodeid, ipaddress, createddate) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
      [userid, params.movieid, params.episodeid, ipaddress, createddate]
    );
    if (result.rowCount === 1) {
      await client.query("UPDATE tbmovieepisode SET view = view + 1, modifieddate = $3 WHERE episodeid = $1 and movieid = $2", [
        params.episodeid,
        params.movieid,
        createddate,
      ]);
    }
    sendResponse(res, 200, "success", "success", "Done");
  } else sendResponse(res, 200, "success", "error", "Episode not exist");
});
