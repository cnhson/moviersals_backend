import { subcriptionSchema } from "../schema/index.js";
import { errorHandler, getPageSize, getQueryOffset, getTotalPages, preProcessingBodyParam, sendResponse } from "../util/index.js";
import { getAmountToPay } from "./orderCon.js";

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
  sendResponse(res, 200, "success", "success", "Tạo gói thành công");
});

export const editSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.editSubcription_Params);

  const check = await client.query("select 1 from tbsubcriptionplaninfo where priority = $1", [params.priority]);
  if (check.rowCount == 1) {
    return sendResponse(res, 200, "success", "error", "Không được trùng độ ưu tiên tồn tại trong hệ thống");
  }

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
  sendResponse(res, 200, "success", "success", "Chỉnh sửa gói thành công");
});

export const deleteSubcriptionPlan_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, subcriptionSchema.deleteSubcription_Params);

  await client.query("Delete from tbsubcriptionplaninfo where subcriptionid = $1", [params.subcriptionid]);
  sendResponse(res, 200, "success", "success", "Xóa gói thành công");
});

export const getUserSubscriptionPrice = async (req, res) => {
  const subcriptionid = req.params.subcriptionid;
  const price = await getAmountToPay(req.user.userid, subcriptionid);
  sendResponse(res, 200, "success", "success", price);
};
