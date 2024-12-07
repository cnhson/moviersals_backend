import { subcriptionSchema } from "../schema/index.js";
import { errorHandler, getPageSize, getQueryOffset, getTotalPages, preProcessingBodyParam, sendResponse } from "../util/index.js";

export const getAllSubcriptionPlan = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query(
    `WITH base_data AS (
       SELECT * FROM tbsubcriptionplaninfo order by id
      ),
      total AS (
        SELECT COUNT(*) AS total_count FROM base_data
      ),
      data AS (
        SELECT * FROM base_data
        LIMIT $1 OFFSET $2
      )
      SELECT (SELECT total_count FROM total) AS total_count, json_agg(data) AS rows
      FROM data;`,
    [size, offset]
  );
  const totalPagges = getTotalPages(result.rows[0].total_count);
  const object = { list: result.rows[0].rows, total: totalPagges };
  sendResponse(res, 200, "success", "success", object);
});

export const createSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.createSubcription_Params);
  await client.query(
    "INSERT INTO tbsubcriptionplaninfo (subcriptionid, name, price, daysduration, baseprice, priority, quality, connection) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      params.subcriptionid,
      params.name,
      params.price,
      params.daysduration,
      params.baseprice,
      params.priority,
      params.quality,
      params.connection,
    ]
  );
  sendResponse(res, 200, "success", "success", "Create subcription plan successfully");
});

export const editSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.editSubcription_Params);

  await client.query(
    "UPDATE tbsubcriptionplaninfo set name = $2, price = $3, daysduration = $4, baseprice = $5, priority = $6, quality = $7, connection = $8,isads = false where subcriptionid = $1",
    [
      params.subcriptionid,
      params.name,
      params.price,
      params.daysduration,
      params.baseprice,
      params.priority,
      params.quality,
      params.connection,
    ]
  );
  sendResponse(res, 200, "success", "success", "Edit subcription plan successfully");
});
