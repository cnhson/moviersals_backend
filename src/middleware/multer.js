import multer from "multer";
import { sendResponse } from "../global/index.js";

export function multerType(inputType) {
  return async function (req, res, next) {
    const storage = multer.memoryStorage(); // Store files in memory
    const upload = multer({ storage: storage });
    upload.single(inputType)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return sendResponse(res, 400, "fail", `Unexpected field name. Expected '${inputType}'.`);
        }
        return sendResponse(res, 400, "fail", "Multer error: " + err.message);
      } else if (err) {
        return sendResponse(res, 500, "fail", "Server error: " + err.message);
      }

      if (!req.file) {
        return sendResponse(res, 400, "fail", `No file provided or wrong field name for '${inputType}'`);
      }
      next();
    });
  };
}
