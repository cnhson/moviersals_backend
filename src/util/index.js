// @ts-nocheck
import moment from "moment-timezone";
import { dbPool } from "../services/database.js";
import querystring from "qs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

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
    acc[field] = null;
    return acc;
  }, {});
}

function validateFields(fields) {
  let missingKey = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === "" || value === undefined) {
      missingKey.push(key);
    }
  }
  const message = "Required value in: " + missingKey.join(", ");
  if (missingKey.length > 0) throw new ValidationError(message);
  return null;
}

export function preProcessingBodyParam(req, schema) {
  const processingParams = buildParams(schema);

  const filteredBody = Object.keys(req.body)
    .filter((key) => processingParams.hasOwnProperty(key)) // only include keys present in schema
    .reduce((obj, key) => {
      obj[key] = req.body[key]; // assign values of valid keys
      return obj;
    }, {});
  Object.assign(processingParams, filteredBody);
  validateFields(processingParams);
  return processingParams;
}

export function preProcessingUrlParam(req) {
  validateFields(req.params);
  return req.params;
}

export function sendResponse(res, statusCode, statusMessage, result, content, codeMessage = undefined) {
  res.status(statusCode).json({
    result: result,
    status: statusMessage,
    content: content,
    code: codeMessage,
  });
}

export function getStringDatetimeNow() {
  return moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
}

export function getDatetimeNow() {
  return moment().tz("Asia/Ho_Chi_Minh");
}

export function getConvertedDatetime(date) {
  return moment(date).tz("Asia/Ho_Chi_Minh");
}

export function getInputVNPayDatetimeNow(date) {
  return moment(date).tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss");
}

export function getInputStringDatetimeNow(date) {
  return moment(date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
}

export function convertVnPayDatetime(date) {
  return moment(date, "YYYYMMDDHHmmss").tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
}

export function getExtendDatetime(day, hour, minute) {
  return moment()
    .tz("Asia/Ho_Chi_Minh")
    .add(Number(day), "days")
    .add(Number(hour), "hours")
    .add(Number(minute), "minutes")
    .format("YYYY-MM-DD HH:mm:ss");
}

export function getInputExtendDatetime(inputdate, day, hour, minute) {
  const baseDatetime = inputdate ? moment(inputdate, "YYYY-MM-DD HH:mm:ss.SSS").tz("Asia/Ho_Chi_Minh") : moment().tz("Asia/Ho_Chi_Minh");

  return baseDatetime.add(Number(day), "days").add(Number(hour), "hours").add(Number(minute), "minutes").format("YYYY-MM-DD HH:mm:ss");
}

export function convertToMoment(date) {
  return moment(date).tz("Asia/Ho_Chi_Minh");
}

export function getReqIpAddress(req) {
  return req.ip || (req.headers["x-forwarded-for"] || "").split(",").pop().trim() || req.socket.remoteAddress;
}

export function createToken(res, tokenType, token, milisecond) {
  return res.cookie(tokenType, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV || "prod" ? true : false,
    sameSite: "None",
    maxAge: milisecond,
  });
}

export function errorHandler(fn) {
  return async (req, res, next) => {
    const client = await dbPool.connect();
    try {
      await fn(req, res, next, client);
    } catch (error) {
      if (error instanceof ValidationError) {
        return sendResponse(res, 400, "fail", "error", error.message);
      }
      console.log("errorhanlder ", error);
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
        return sendResponse(res, 400, "fail", "error", error.message);
      }
      console.log(error);
      return sendResponse(res, 500, "fail", "error", "Internal server error");
    } finally {
      client.release();
    }
  };
}

export function errorHandlerTransactionPlain(fn) {
  return async () => {
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");
      await fn(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.log(error);
    } finally {
      client.release();
    }
  };
}

export function convertToPlainText(input) {
  try {
    if (typeof input == "string") {
      let result = input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      result = result.replace(/đ/g, "d");
      result = result.replace(/[^a-z0-9,]/g, "");
      return result;
    } else return null;
  } catch (error) {
    console.log("Error while converting to plain text: ", error);
  }
}

export function queryStringify(params) {
  return querystring.stringify(Object(params), { encode: false });
}

export function getSignatureKey(data, secretKey) {
  let hmac = crypto.createHmac("sha512", secretKey);
  return hmac.update(Buffer.from(data, "utf-8")).digest("hex");
}

export function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

export function getPageSize() {
  return Number(process.env.PAGE_SIZE) || 15;
}

export function getQueryOffset(page) {
  page = parseInt(page) || 1;
  return (Number(page) - 1) * Number(process.env.PAGE_SIZE);
}

export function getTotalPages(total) {
  return Math.ceil(Number(total) / getPageSize()) || 0;
}

export function isTokenExpired(refreshToken) {
  try {
    const decodedToken = jwt.decode(refreshToken);
    if (!decodedToken || !decodedToken.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
  }
}
