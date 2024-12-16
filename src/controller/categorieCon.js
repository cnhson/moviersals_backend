import { categorieSchema } from "../schema/index.js";
import { errorHandler, getPageSize, getQueryOffset, getTotalPages, preProcessingBodyParam, sendResponse } from "../util/index.js";

export const getAllCategories = errorHandler(async (req, res, next, client) => {
  let result = null;
  let object = null;

  const page = Number(req.query.page) || null;
  if (page != null || page != undefined) {
    const offset = getQueryOffset(page);
    const size = getPageSize();
    result = await client.query(
      `WITH base_data AS (
      select * from tbcategoriesinfo
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
    object = { list: result.rows[0].rows, total: totalPagges };
  } else {
    result = await client.query(`select * from tbcategoriesinfo`);
    object = { list: result.rows, total: 1 };
  }
  sendResponse(res, 200, "success", "success", object);
});

export const createCategories_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, categorieSchema.createCategorie_Params);
  await client.query("INSERT INTO tbcategoriesinfo (name, namevi) VALUES ($1, $2)", [params.name, params.namevi]);
  sendResponse(res, 200, "success", "success", "Tạo thể loại thành công");
});

export const editCategories_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, categorieSchema.editCategorie_Params);

  await client.query("UPDATE tbcategoriesinfo set name = $2, namevi = $3 where id = $1", [params.id, params.name, params.namevi]);
  sendResponse(res, 200, "success", "success", "Chỉnh sửa thể loại thành công");
});

export const deleteCategories_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, categorieSchema.deleteCategories_Params);

  await client.query("Delete from tbcategoriesinfo where id = $1 and name = $2", [params.id, params.name]);
  sendResponse(res, 200, "success", "success", "Xóa thể loại thành công");
});
