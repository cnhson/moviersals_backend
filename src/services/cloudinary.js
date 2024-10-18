import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function uploadImage(imageAndExtension) {
  await cloudinary.uploader
    .upload(`../uploads/${imageAndExtension}`, {
      public_id: imageAndExtension.split(".")[0],
      transformation: [{ width: 500, height: 500, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }],
    })
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
      return null;
    });
}
