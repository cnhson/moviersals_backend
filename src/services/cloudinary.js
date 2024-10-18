import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadCloudImage(imageFile) {
  try {
    const b64 = Buffer.from(imageFile.buffer).toString("base64");
    const dataURI = "data:" + imageFile.mimetype + ";base64," + b64;
    const res = await cloudinary.uploader.upload(dataURI);
    return res.secure_url;
  } catch (error) {
    throw new Error("Image upload failed: " + error.message);
  }
}