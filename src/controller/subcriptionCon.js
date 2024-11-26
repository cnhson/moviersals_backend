import { subcriptionSchema } from "../schema";
import { errorHandler, preProcessingBodyParam, sendResponse } from "../util";

export const getAllSubcriptionPlan = errorHandler(async (req, res, next, client) => {
  const result = await client.query("SELECT * FROM tbsubcriptionplaninfo");
  sendResponse(res, 200, "success", "success", result.rows);
});

export const createSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.createSubcriptionPlan__Params);
  await client.query("INSERT INTO tbsubcriptionplaninfo (subcriptionid, name, amount, daysduration) VALUES ($1, $2, $3, $4)", [
    params.subcriptionid,
    params.name,
    params.amount,
    params.daysduration,
  ]);
  sendResponse(res, 200, "success", "success", "Create subcription plan successfully");
});

export const editSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.editSubcription_Params);

  const result = await client.query("UPDATE tbsubcriptionplaninfo set name = $2, amount = $3, daysduration = $4 where subcriptionid = $1", [
    params.subcriptionid,
    params.name,
    params.amount,
    params.daysduration,
  ]);
  sendResponse(res, 200, "success", "success", "Edit subcription plan successfully");
});
