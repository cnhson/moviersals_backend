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
  sendResponse(res, 200, "success", "success", roomid);
});

export const editLivestream_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, livestreamSchema.editLivestream_Params);

  const result = await client.query(
    "UPDATE tblivestream SET roomname = $2, description = $3, ispremium = $4, isstreaming = $5 WHERE id = $1",
    [params.id, params.roomname, params.description, params.ispremium, params.isstreaming]
  );
  const movieEpisode = result.rows;
  sendResponse(res, 200, "success", "success", movieEpisode);
});

export const getAllLivestream = errorHandler(async (req, res, next, client) => {
  const isend = req.query.isend || null;
  let conditionStr = "";
  if (isend) conditionStr = "WHERE isstreaming = " + isend;
  const data = await client.query("Select * from tblivestream " + conditionStr);
  sendResponse(res, 200, "success", "success", data);
});

export const getLivestream = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, livestreamSchema.getLiveStream_Params);

  const data = await client.query("Select * from tblivestream where id = $1 and roomid = $2", [params.id, params.roomid]);
  sendResponse(res, 200, "success", "success", data);
});
