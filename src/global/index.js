import moment from "moment";
import { dbPool } from "../services/database.js";

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

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

function buildParams(fields) {
  return fields.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {});
}

function validateFields(fields) {
  let missingKey = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value == "" || value.length == 0) {
      missingKey.push(key);
    }
  }
  const message = "Required value in: " + missingKey.join(", ");
  if (missingKey.length > 0) throw new ValidationError(message);
  return null;
}

export function preProcessing(req, schema) {
  const processingParams = buildParams(schema);
  Object.assign(processingParams, req.body);

  validateFields(processingParams); // This will throw ValidationError if fields are missing
  return processingParams;
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

export function errorHandler(fn) {
  return async (req, res, next) => {
    const client = await dbPool.connect();
    try {
      await fn(req, res, next, client);
    } catch (error) {
      if (error instanceof ValidationError) {
        return sendResponse(res, 400, "success", error.message); // No console log for ValidationError
      }
      next(error);
      console.log(error);
      return sendResponse(res, 500, "fail", "Internal server error");
    } finally {
      client.release();
    }
  };
}

export function errorHandlerTransaction(fn) {
  return async (req, res, next) => {
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");
      await fn(req, res, next, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ValidationError) {
        return sendResponse(res, 400, "success", error.message); // No console log for ValidationError
      }
      next(error);
      console.log(error);
      return sendResponse(res, 500, "fail", "Internal server error");
    } finally {
      client.release();
    }
  };
}
