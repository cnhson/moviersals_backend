import { sendResponse, getDatetimeNow, errorHandler, errorHandlerTransaction, preProcessing } from "../global/index.js";
import { replaceCLoudImage, uploadCloudImage } from "../services/cloudinary.js";
import { driveCreateFolder, uploadVideoToDrive } from "../services/googledrive.js";
import { movieSchema } from "../schema/index.js";

export const getMovieList = errorHandler(async (req, res, next, client) => {
  const result = await client.query("SELECT id, name, thumbnail, publishyear, categories, type, ispremium FROM tbmovieinfo");
  const movieList = result.rows;
  sendResponse(res, 200, "success", movieList);
});

export const getMovieDetail = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.checkResetPasswordToken);
  const result = await client.query("SELECT * FROM tbmovieinfo WHERE id = $1", [params.movieid]);
  const movieDetail = result.rows[0];
  sendResponse(res, 200, "success", movieDetail);
});

export const getMovieEpisode = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.getMovieEpisodeParams);
  const result = await client.query("SELECT * FROM tbmovieepisode WHERE movieid = $1, episodeid = $2", [params.movieid, params.episodeid]);
  const movieEpisode = result.rows;
  sendResponse(res, 200, "success", movieEpisode);
});

export const uploadImage_ = errorHandler(async (req, res, next, client) => {
  if (!req.file) {
    return sendResponse(res, 200, "fail", "No file uploaded");
  }
  const imageUrl = await uploadCloudImage(req.file);
  sendResponse(res, 200, "success", imageUrl);
});

export const createMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.createMovieInfo_Params);
  if (!req.file) return sendResponse(res, 200, "fail", "No file uploaded");
  const folderid = await driveCreateFolder(params.name);
  const imageUrl = await uploadCloudImage(req.file);
  const createdDateTime = getDatetimeNow();
  await client.query(
    "INSERT INTO tbmovieinfo (name, description, publisher, publishyear, thumbnail, categories, type, ispremium, folderid, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      params.name,
      params.description,
      params.publisher,
      params.publishyear,
      imageUrl,
      params.categories,
      params.type,
      params.ispremium,
      folderid,
      createdDateTime,
    ]
  );
  sendResponse(res, 200, "success", "Movie uploaded successfully");
});

export const editMovieInfo_ = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.editMovieInfo_Params);
  if (req.file) {
    const tuhmbnailResult = await client.query("SELECT thumbnail FROM tbmovieinfo WHERE id = $1", [params.id]);
    const storedpublickey = tuhmbnailResult.rows[0].thumbnail.substr(process.env.CLOUD_IMAGE_URL.length);
    await replaceCLoudImage(req.file, storedpublickey);
  }
  const modifiedDate = getDatetimeNow();
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
      params.id,
    ]
  );
  sendResponse(res, 200, "success", "Movie uploaded successfully");
});

export const deleteMovieInfo_ = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.deleteMovieInfo_Params);
  await client.query("DELETE FROM tbmovieinfo WHERE id = $1", [params.id]);
  sendResponse(res, 200, "success", "Movie deleted successfully");
});

export const categoriesFilter = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, movieSchema.categoriesFilter);
  const result = await client.query("SELECT * FROM tbmovieinfo t where t.categories::jsonb @> $1", [params.categories]);
  sendResponse(res, 200, "success", result.rows);
});
