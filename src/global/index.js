import moment from "moment";

export function generateRandomString(size) {
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function randomDelay(maxMilisecond) {
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * maxMilisecond); // Random delay between 0 and 200 ms
    setTimeout(resolve, delay);
  });
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

export function getDatetimeNow() {
  return moment().format("YYYY-MM-DD HH:mm:ss");
}

export function getPlusHourDateTime(hour) {
  return moment().add(Number(hour), "hours").format("YYYY-MM-DD HH:mm:ss");
}

export function getPlusMinuteDateTime(minute) {
  return moment().add(Number(minute), "minutes").format("YYYY-MM-DD HH:mm:ss");
}
