// @ts-nocheck
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { Readable } from "stream";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URIS
);

const oath2client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URIS);
oath2client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oath2client,
});

export async function driveCreateFolder(folderName) {
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });
  const folderId = folder.data.id;
  return folderId;
}

// Function to convert a Buffer into a Readable stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
// Function to upload a file
export async function uploadVideoToDrive(fileBuffer, fileName, folderId, mimetype) {
  const fileMetadata = {
    name: fileName,
    parents: [folderId], // Specify the folder ID to upload to, change if needed
  };
  const media = {
    mimeType: mimetype, // Change to the appropriate MIME type for your video
    body: bufferToStream(fileBuffer), // Use buffer directly from multer
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    console.log(`File uploaded with ID: ${file.data.id}`);
    return file.data.id;
  } catch (error) {
    console.error("Error uploading file:", error.response ? error.response.data.error : error.message);
    throw error;
  }
}
