import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
} from "../util/index.js";
import { episodeSchema } from "../schema/index.js";

export const uploadEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.uploadEpisode_Params);
  const result = await client.query("SELECT folderid FROM tbmovieinfo WHERE id = $1", [params.movieid]);
  const createdDateTime = getStringDatetimeNow();
  const episodeid = generateRandomString(10) + "_" + params.episodenumber;
  await client.query(
    "INSERT INTO tbmovieepisode (movieid, episodeid, episodenumber,episodepath, createddate) VALUES ($1, $2, $3, $4, $5)",
    [params.movieid, episodeid, params.episodenumber, params.episodepath, createdDateTime]
  );
  return sendResponse(res, 200, "success", "Upload movie's episode successfully");
});

export const editEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, episodeSchema.editEpisode_Params);
  await client.query("UPDATE tbmovieepisode SET episodepath = $2 WHERE movieid = $1 and episodenumber = $3", [
    params.movieid,
    params.episodepath,
    params.episodenumber,
  ]);
  return sendResponse(res, 200, "success", "Edit movie's episode successfully");
});
