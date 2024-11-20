import {
  sendResponse,
  getStringDatetimeNow,
  errorHandler,
  errorHandlerTransaction,
  preProcessingBodyParam,
  preProcessingUrlParam,
  generateRandomString,
} from "../util/index.js";
import { livestreamSchema } from "../schema/index.js";

export const createLivestream_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, livestreamSchema.createLivestream_Params);
  const roomid = generateRandomString(20);
  await client.query(
    "INSERT INTO tblivestream (roomname, creator, description, createddate, path, ispremium) VALUES ($1, $2, $3, $4, $5, $6)",
    [params.roomname, params.creator, params.description, getStringDatetimeNow(), roomid, params.ispremium]
  );
  sendResponse(res, 200, "success", roomid);
});

export const editLivestream_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, livestreamSchema.editLivestream_Params);

  const result = await client.query("UPDATE tblivestream SET roomname = $2, description = $3, ispremium = $4 WHERE id = $1", [
    params.roomname,
    params.description,
    params.ispremium,
    params.id,
  ]);
  const movieEpisode = result.rows;
  sendResponse(res, 200, "success", movieEpisode);
});
