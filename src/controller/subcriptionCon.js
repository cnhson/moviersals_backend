import { subcriptionSchema } from "../schema/index.js";
import { errorHandler, getPageSize, getQueryOffset, preProcessingBodyParam, sendResponse } from "../util/index.js";

export const getAllSubcriptionPlan = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query("SELECT * FROM tbsubcriptionplaninfo order by id LIMIT $1 OFFSET $2 ", [size, offset]);
  sendResponse(res, 200, "success", "success", result.rows);
});

export const createSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.createSubcription_Params);
  await client.query(
    "INSERT INTO tbsubcriptionplaninfo (subcriptionid, name, amount, daysduration, baseprice, priority, quality) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [params.subcriptionid, params.name, params.amount, params.daysduration, params.baseprice, params.priority, params.quality]
  );
  sendResponse(res, 200, "success", "success", "Create subcription plan successfully");
});

export const editSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.editSubcription_Params);

  await client.query(
    "UPDATE tbsubcriptionplaninfo set name = $2, amount = $3, daysduration = $4, baseprice = $5, priority = $6, quality = $7, isads = $8 where subcriptionid = $1",
    [params.subcriptionid, params.name, params.amount, params.daysduration, params.baseprice, params.priority, params.quality, params.isads]
  );
  sendResponse(res, 200, "success", "success", "Edit subcription plan successfully");
});
