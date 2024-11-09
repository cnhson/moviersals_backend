import {
  generateRandomString,
  sendResponse,
  getDatetimeNow,
  getPlusMinuteDateTime,
  errorHandlerTransaction,
  errorHandler,
  preProcessing,
} from "../global/index.js";
import { episodeSchema } from "../schema/index.js";
import { uploadVideoToDrive } from "../services/googledrive.js";

export const uploadEpisode_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, episodeSchema.uploadEpisode_Params);
  const result = await client.query("SELECT folderid FROM tbmovieinfo WHERE id = $1", [params.movieid]);
  const folderid = result.rows[0].folderid;
  const videoid = await uploadVideoToDrive(req.file.videoBuffer, params.episodenumber, folderid, req.file.mimetype);
  const pathToEpisodeVideo = process.env.GOOGLE_DRIVE_FILE_URL + videoid;
  const createdDateTime = getDatetimeNow();
  const episodeid = folderid + "_" + params.episodenumber;
  await client.query(
    "INSERT INTO tbmovieepisode (movieid, episodeid, episodenumber,episodepath, createddate) VALUES ($1, $2, $3, $4, $5)",
    [params.movieid, episodeid, params.episodenumber, pathToEpisodeVideo, createdDateTime]
  );
  return sendResponse(res, 200, "success", "Upload movie's episode successfully");
});
