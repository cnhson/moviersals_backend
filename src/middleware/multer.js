import multer from "multer";
import { sendResponse } from "../util/index.js";

export function multerType(inputType, required = true) {
  return async function (req, res, next) {
    const storage = multer.memoryStorage(); // Store files in memory
    const upload = multer({ storage: storage });

    upload.single(inputType)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return sendResponse(res, 400, "success", `Unexpected field name. Expected '${inputType}'.`);
        }
        return sendResponse(res, 400, "success", "Multer error: " + err.message);
      } else if (err) {
        return sendResponse(res, 500, "success", "Unknown error: " + err.message);
      }
      if (required && !req.file) {
        return sendResponse(res, 400, "success", `No file provided or wrong field name for: ${inputType}`);
      }
      next();
    });
  };
}
