import { generateSignature } from "../services/cloudinary.js";
import { errorHandler, sendResponse } from "../util/index.js";

export const createCloudinarySignature_ = errorHandler(async (req, res, next, client) => {
  // const { paramsToSign } = req.body;
  const signature = generateSignature(req.body);
  return res.status(200).json({ signature });
});
