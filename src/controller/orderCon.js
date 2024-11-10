import {
  generateRandomString,
  sendResponse,
  getDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
} from "../global/index.js";
import { sendEmail } from "../services/mailer.js";

export const createOrder = errorHandler(async (req, res, next, client) => {});

export const getAllOrders = errorHandler(async (req, res, next, client) => {});
