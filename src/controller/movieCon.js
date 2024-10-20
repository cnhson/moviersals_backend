import { dbPool } from "../services/database.js";
import moment from "../../node_modules/moment/moment.js";
import { sendResponse, validateFields, getDatetimeNow } from "../global/index.js";
import { replaceCLoudImage, uploadCloudImage } from "../services/cloudinary.js";
import { driveCreateFolder, uploadVideoToDrive } from "../services/googledrive.js";

export async function getMovieList(req, res) {
  const client = await dbPool.connect();
  try {
    const result = await client.query("SELECT id, name, thumbnail, publishyear, categories, type, ispremium FROM tbmovieinfo");
    const movieList = result.rows;
    sendResponse(res, 200, "success", movieList);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function getMovieDetail(req, res) {
  const client = await dbPool.connect();
  try {
    const { movieid } = req.params;
    const result = await client.query("SELECT * FROM tbmovieinfo WHERE id = $1", [movieid]);
    const movieDetail = result.rows[0];
    sendResponse(res, 200, "success", movieDetail);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function getMovieEpisode(req, res) {
  const client = await dbPool.connect();
  try {
    const { movieid, episodeid } = req.params;
    const result = await client.query("SELECT * FROM tbmovieepisode WHERE movieid = $1, episodeid = $2", [movieid, episodeid]);
    const movieEpisode = result.rows;
    sendResponse(res, 200, "success", movieEpisode);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return sendResponse(res, 200, "fail", "No file uploaded");
    }
    const imageUrl = await uploadCloudImage(req.file);
    sendResponse(res, 200, "success", imageUrl);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  }
}

export async function createMovieInfo(req, res) {
  const client = await dbPool.connect();

  try {
    const { name, description, publisher, publishyear, categories, type, ispremium } = req.body;
    const error = validateFields({ name, description, publisher, publishyear, categories, type, ispremium });
    if (error) return sendResponse(res, 200, "fail", error);
    if (!req.file) return sendResponse(res, 200, "fail", "No file uploaded");
    const folderid = await driveCreateFolder(name);
    const imageUrl = await uploadCloudImage(req.file);
    const createdDate = getDatetimeNow();
    await client.query(
      "INSERT INTO tbmovieinfo (name, description, publisher, publishyear, thumbnail, categories, type, ispremium, folderid, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [name, description, publisher, publishyear, imageUrl, categories, type, ispremium, folderid, createdDate]
    );
    sendResponse(res, 200, "success", "Movie uploaded successfully");
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  } finally {
    client.release();
  }
}

export async function editMovieInfo(req, res) {
  const client = await dbPool.connect();
  const { id, name, description, publisher, publishyear, thumbnail, categories, type, ispremium } = req.body;
  const error = validateFields({ name, description, publisher, publishyear, thumbnail, categories, type, ispremium });
  if (error) return sendResponse(res, 200, "fail", error);
  if (!req.file) return sendResponse(res, 200, "fail", "No file uploaded");
  await client.query("BEGIN");
  const result = await client.query("SELECT thumbnail FROM tbmovieinfo WHERE id = $1", [id]);
  const storedpublickey = result.rows[0].thumbnail.substr(process.env.CLOUD_IMAGE_URL.length);
  await replaceCLoudImage(req.file, storedpublickey);
  const modifiedDate = getDatetimeNow();
  await client.query(
    "UPDATE tbmovieinfo SET name = $1, description = $2, publisher = $3, publishyear = $4, categories = $5, type = $6, ispremium = $7, modifieddate = $8 WHERE id = $9",
    [name, description, publisher, publishyear, categories, type, ispremium, modifiedDate, id]
  );
  await client.query("COMMIT");
  sendResponse(res, 200, "success", "Movie uploaded successfully");
  try {
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  } finally {
    client.release();
  }
}

export async function deleteMovieInfo(req, res) {
  const client = await dbPool.connect();
  try {
    const { id } = req.body;
    await client.query("DELETE FROM tbmovieinfo WHERE id = $1", [id]);
    sendResponse(res, 200, "success", "Movie deleted successfully");
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  } finally {
    client.release();
  }
}

export async function categoriesFilter(req, res) {
  const client = await dbPool.connect();
  try {
    const { categories } = req.body;
    const result = await client.query("SELECT * FROM tbmovieinfo t where t.categories::jsonb @> $1", [categories]);
    sendResponse(res, 200, "success", result.rows);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  } finally {
    client.release();
  }
}

export async function uploadEpisode(req, res) {
  const client = await dbPool.connect();
  try {
    const videoBuffer = Buffer.from(req.file.buffer);
    const mimetype = req.file.mimetype;
    const { movieid, episodeid } = req.body;
    const error = validateFields({ movieid, episodeid });
    if (error) return sendResponse(res, 200, "fail", error);

    await client.query("BEGIN");
    const result = await client.query("SELECT folderid FROM tbmovieinfo WHERE id = $1", [movieid]);
    const folderid = result.rows[0].folderid;
    const videoid = await uploadVideoToDrive(videoBuffer, episodeid, folderid, mimetype);
    const pathToEpisodeVideo = process.env.GOOGLE_DRIVE_FILE_URL + videoid;
    const createdDate = getDatetimeNow();
    await client.query("INSERT INTO tbmovieepisode (movieid, episodeid, episodepath, createddate) VALUES ($1, $2, $3, $4)", [
      movieid,
      episodeid,
      pathToEpisodeVideo,
      createdDate,
    ]);
    await client.query("COMMIT");
    return sendResponse(res, 200, "success", videoid);
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal server error");
  } finally {
    client.release();
  }
}
