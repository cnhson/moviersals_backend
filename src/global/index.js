export function generateRandomString(size) {
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function validateFields(fields) {
  let missingKey = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      missingKey.push(key);
    }
  }
  if (missingKey.length > 0) return "Missing: " + missingKey.join(", ");
  else return null;
}

export function sendResponse(res, statusCode, result, content) {
  res.status(statusCode).json({ result: result, content: content });
}
