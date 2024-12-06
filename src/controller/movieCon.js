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
  console.log("Here");
  sendResponse(res, 200, "success", "success", imageUrl);
});

export const getMovieList = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();

  const result = await client.query(
    `WITH base_data AS (
      SELECT t.*, AVG(t2.rating) AS avgrating
        FROM tbmovieinfo t
        full join tbmoviecomment t2 ON t.movieid = t2.movieid
        GROUP BY t.id
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
            ON t.movieid = t2.movieid 
            AND t2.userid = $1
        WHERE t.movieid = $2
        ORDER BY t.episodenumber ASC;`,
    [userid, movieid]
  );
  const result = await client.query(
    ` SELECT t.*, SUM(t2.view) as view FROM tbmovieinfo t  
    join tbmovieepisode t2 on t.movieid = t2.movieid
    where t.movieid = $1
    group by t.id`,
    [movieid]
  );
  const movieDetail = result.rows[0];
  sendResponse(res, 200, "success", "success", { movieDetail, list: episodelist.rows });
});

export const getMovieEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessingUrlParam(req);
  const check = await client.query("SELECT ispremium FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
  if (check.rowCount == 0) return sendResponse(res, 200, "success", "error", "Movie not exist");

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
    return sendResponse(res, 200, "fail", "No file uploaded");
  }
  const imageUrl = await uploadCloudImage(req.file);
  sendResponse(res, 200, "success", imageUrl);
});

export const createMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.createMovieInfo_Params);
  if (!req.file) return sendResponse(res, 200, "fail", "No file uploaded");
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
  sendResponse(res, 200, "success", "Movie uploaded successfully");
});

export const editMovieInfo_ = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.editMovieInfo_Params);
  if (req.file) {
    const tuhmbnailResult = await client.query("SELECT thumbnail FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
    const storedpublickey = tuhmbnailResult.rows[0].thumbnail.substr(process.env.CLOUD_IMAGE_URL.length);
    await replaceCLoudImage(req.file, storedpublickey);
  }
  const modifiedDate = getStringDatetimeNow();
  await client.query(
    "UPDATE tbmovieinfo SET name = $1, description = $2, publisher = $3, publishyear = $4, categories = $5, type = $6, ispremium = $7, modifieddate = $8 WHERE id = $9",
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
  sendResponse(res, 200, "success", "Movie uploaded successfully");
});

export const deleteMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.deleteMovieInfo_Params);
  await client.query("DELETE FROM tbmovieinfo WHERE movieid = $1", [params.movieid]);
  sendResponse(res, 200, "success", "Movie deleted successfully");
});

export const categoriesFilter = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, movieSchema.categoriesFilter);
  const result = await client.query("SELECT * FROM tbmovieinfo t where t.categories::jsonb @> $1", [params.categories]);
  sendResponse(res, 200, "success", result.rows);
});

export const getMovieAllEpisodes_ = errorHandler(async (req, res, next, client) => {
  const movieid = req.params.movieid;
  const result = await client.query("SELECT * FROM tbmovieepisode t where t.movieid = $1", [movieid]);
  sendResponse(res, 200, "success", result.rows);
});

export const getCategories = errorHandler(async (req, res, next, client) => {
  const result = await client.query("SELECT * FROM tbmoviecategories");
  sendResponse(res, 200, "success", result.rows);
});
