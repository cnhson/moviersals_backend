import {
  sendResponse,
  getStringDatetimeNow,
  errorHandler,
  errorHandlerTransaction,
  preProcessingBodyParam,
  preProcessingUrlParam,
  convertToPlainText,
  getQueryOffset,
  getPageSize,
  getDatetimeNow,
  getTotalPages,
} from "../util/index.js";
import { replaceCLoudImage, uploadCloudImage } from "../services/cloudinary.js";
import { movieSchema } from "../schema/index.js";

export const testUploadImage_ = errorHandler(async (req, res, next, client) => {
  const imageUrl = await uploadCloudImage(req.file);
  sendResponse(res, 200, "success", "success", imageUrl);
});

export const getMovieList = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();

  const result = await client.query(
    `WITH base_data AS (
	  WITH total_views AS (
          SELECT 
              movieid,
              SUM(view) AS total_view
          FROM 
             tbmovieepisode
			group by movieid
      ),
      avg_ratings AS (
          SELECT 
              movieid,
              AVG(t.rating)::float AS avg_rating
          FROM 
              tbmoviecomment t 
          where isactive = true
          group by movieid
      )
        SELECT 
            t.*, 
            (select total_view from total_views sub where sub.movieid = t.movieid) as view,
            (select avg_rating from avg_ratings sub where sub.movieid = t.movieid) as avgrating,
            JSON_AGG(DISTINCT tc.namevi)::text AS categoriesvi
        FROM 
            tbmovieinfo t
        FULL JOIN 
            tbmoviecomment t2 ON t.movieid = t2.movieid
        LEFT JOIN LATERAL 
            JSONB_ARRAY_ELEMENTS_TEXT(t.categories::JSONB) AS category_name ON TRUE
        LEFT JOIN 
            tbcategoriesinfo tc ON category_name ILIKE tc.name
        GROUP BY 
            t.id
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

export const getMovieDetail = errorHandler(async (req, res, next, client) => {
  const userid = req.query.userid || "";
  const movieid = req.params.movieid;
  const episodelist = await client.query(
    `SELECT t.*, 
        CASE 
            WHEN t2.movieid IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END AS isfavourite
        FROM tbmovieepisode t
        LEFT JOIN tbfavouritelist t2 
            ON t.movieid = t2.movieid and t.episodenumber = t2.episodenumber 
            AND t2.userid = $1
        WHERE t.movieid = $2
        ORDER BY t.episodenumber ASC;`,
    [userid, movieid]
  );
  const result = await client.query(
    `WITH total_views AS (
          SELECT 
              SUM(view) AS total_view
          FROM 
              tbmovieepisode
          where movieid = $1
      ),
      avg_ratings AS (
          SELECT 
              AVG(t.rating)::float AS avg_rating
          FROM 
              tbmoviecomment t 
          where movieid = $1 and isactive = true
      )
      SELECT 
          t.*, 
          (select * from total_views) as view,
          (select * from avg_ratings) as avgrating,
          JSON_AGG(DISTINCT tc.namevi)::text AS categoriesvi
      FROM 
          tbmovieinfo t
      LEFT JOIN LATERAL 
          JSONB_ARRAY_ELEMENTS_TEXT(t.categories::JSONB) AS category_name ON TRUE
      LEFT JOIN 
          tbcategoriesinfo tc ON category_name ILIKE tc.name
      WHERE 
          t.movieid = $1
      GROUP BY 
          t.id;`,
    [movieid]
  );
  const movieDetail = result.rows[0];
  sendResponse(res, 200, "success", "success", { movieDetail, list: episodelist.rows });
});

export const getMovieEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingUrlParam(req);
  const check = await client.query("SELECT ispremium FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
  if (check.rowCount == 0) return sendResponse(res, 200, "success", "error", "Bộ phim không tồn tại");

  const ispremium = check.rows[0].ispremium;
  const usercheck = await client.query("SELECT usingend FROM tbusersubscription WHERE userid = $1", [req.user.userid]);
  if (getDatetimeNow().isAfter(usercheck.rows[0].usingend) && ispremium)
    return sendResponse(res, 200, "success", "error", "Only premium user can access!");
  const result = await client.query("SELECT * FROM tbmovieepisode WHERE movieid = $1 and episodenumber = $2", [
    params.movieid,
    params.episodeid,
  ]);
  const movieEpisode = result.rows;
  sendResponse(res, 200, "success", "success", movieEpisode);
});

export const uploadImage_ = errorHandler(async (req, res, next, client) => {
  if (!req.file) {
    return sendResponse(res, 200, "fail", "Không tìm thấy file hình ảnh");
  }
  const imageUrl = await uploadCloudImage(req.file);
  sendResponse(res, 200, "success", "success", imageUrl);
});

export const createMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.createMovieInfo_Params);

  const categoriesArray = JSON.parse(params.categories) || [];
  if (categoriesArray.length == 0) return sendResponse(res, 200, "success", "error", "Thể loại không được để trống");
  params.categories = params.categories.replace(/\\"/g, '"');

  const imageUrl = await uploadCloudImage(req.file);
  const createdDateTime = getStringDatetimeNow();

  const movieid = convertToPlainText(params.name);
  await client.query(
    "INSERT INTO tbmovieinfo (name, description, publisher, publishyear, thumbnail, categories, type, ispremium, createddate, movieid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      params.name,
      params.description,
      params.publisher,
      params.publishyear,
      imageUrl,
      params.categories,
      params.type,
      params.ispremium,
      createdDateTime,
      movieid,
    ]
  );
  sendResponse(res, 200, "success", "success", "Upload phim thành công");
});

export const editMovieInfo_ = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.editMovieInfo_Params);

  const categoriesArray = JSON.parse(params.categories) || [];
  if (categoriesArray.length == 0) return sendResponse(res, 200, "success", "error", "Thể loại không được để trống");
  params.categories = params.categories.replace(/\\"/g, '"');

  if (req.file) {
    const thumbnailResult = await client.query("SELECT thumbnail FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
    const storedpublickey = thumbnailResult.rows[0].thumbnail.substr(process.env.CLOUD_IMAGE_URL.length);
    await replaceCLoudImage(req.file, storedpublickey);
  }

  const modifiedDate = getStringDatetimeNow();
  await client.query(
    "UPDATE tbmovieinfo SET name = $1, description = $2, publisher = $3, publishyear = $4, categories = $5, type = $6, ispremium = $7, modifieddate = $8 WHERE movieid = $9",
    [
      params.name,
      params.description,
      params.publisher,
      params.publishyear,
      params.categories,
      params.type,
      params.ispremium,
      modifiedDate,
      params.movieid,
    ]
  );
  sendResponse(res, 200, "success", "success", "Chỉnh sửa phim thành công");
});

export const deleteMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.deleteMovieInfo_Params);
  await client.query("DELETE FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
  sendResponse(res, 200, "success", "success", "Xóa phim thành công");
});

export const categoriesFilter = errorHandler(async (req, res, next, client) => {
  const moviename = req.body.moviename || null;
  let categories = req.body.categories || null;
  const ispremium = req.body.ispremium || null;

  if (categories.includes('"')) {
    categories = categories.replace(/\\"/g, '"');
  } else categories = null;

  const year = req.body.year || null;
  const page = Number(req.body.page) || 1;
  const size = getPageSize();
  const offset = getQueryOffset(page);

  const result = await client.query(
    `WITH total_views AS (
          SELECT 
              t2.movieid,
              SUM(view) AS total_view
          FROM 
              tbmovieepisode t
          JOIN 
              tbmovieinfo t2 ON t.movieid = t2.movieid
          GROUP BY 
              t2.movieid
      ),
      avg_ratings AS (
          SELECT 
              t2.movieid,
              AVG(t.rating)::float AS avg_rating
          FROM 
              tbmoviecomment t
          JOIN 
              tbmovieinfo t2 ON t.movieid = t2.movieid
          WHERE 
              t.isactive = true
          GROUP BY 
              t2.movieid
      ),
      base_data AS (
          SELECT 
              t.*, 
              COALESCE(tv.total_view, 0) AS view,
              COALESCE(ar.avg_rating, 0) AS avgrating,
              JSON_AGG(tc.namevi ORDER BY category_name) AS categoriesvi
          FROM 
              tbmovieinfo t
          LEFT JOIN 
              total_views tv ON tv.movieid = t.movieid
          LEFT JOIN 
              avg_ratings ar ON ar.movieid = t.movieid
          LEFT JOIN LATERAL 
              JSONB_ARRAY_ELEMENTS_TEXT(t.categories::JSONB) AS category_name ON TRUE
          LEFT JOIN 
              tbcategoriesinfo tc ON category_name ILIKE tc.name
          WHERE
              ($3::text IS NULL OR t.name ILIKE CONCAT('%', $3, '%'))
              AND ($4::text IS NULL OR t.publishyear = $4)
              AND ($5::jsonb IS NULL OR t.categories::jsonb @> $5::jsonb)
              AND ($6::boolean IS NULL OR t.ispremium = $6)
          GROUP BY 
              t.id, tv.total_view, avg_rating
      ),
      total AS (
          SELECT COUNT(*) AS total_count FROM base_data
      ),
      data AS (
          SELECT * FROM base_data
          LIMIT $1 OFFSET $2
      )
      SELECT 
          (SELECT total_count FROM total) AS total_count, 
          json_agg(data) AS rows
      FROM data;`,
    [
      size,
      offset,
      moviename ? moviename : null, // Ensure moviename is treated as LIKE search or NULL
      year ? year : null, // Ensure year is either the value or NULL
      categories, // Handle categories as JSON
      ispremium,
    ]
  );

  const totalPages = getTotalPages(result.rows[0].total_count);
  const object = { list: result.rows[0].rows, total: totalPages };
  sendResponse(res, 200, "success", "success", object);
});

export const getMovieAllEpisodes_ = errorHandler(async (req, res, next, client) => {
  const movieid = req.params.movieid;
  const result = await client.query("SELECT * FROM tbmovieepisode t where t.movieid = $1", [movieid]);
  sendResponse(res, 200, "success", "success", result.rows);
});
