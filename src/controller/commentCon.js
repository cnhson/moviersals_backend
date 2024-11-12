import bcrypt from "bcryptjs";
import moment from "../../node_modules/moment/moment.js";
import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
} from "../global/index.js";
import { sendEmail } from "../services/mailer.js";

export const createComment = errorHandler(async (req, res, next, client) => {});

export const editComment = errorHandler(async (req, res, next, client) => {});

export const removeComment = errorHandler(async (req, res, next, client) => {});

export const getAllComments = errorHandler(async (req, res, next, client) => {});
