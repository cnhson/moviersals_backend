import jwt from "jsonwebtoken";
import { clearIsLoginCookie, sendResponse } from "../util/index.js";
import { dbPool } from "../services/database.js";

export async function authenticateJWT(req, res, next) {
  if (!req.cookies) {
    clearIsLoginCookie(res);

    return sendResponse(res, 401, "success", "error", "Không tìm thấy cookie", "error_no_cookie");
  }

  const { accessToken, refreshToken } = req.cookies;

  if (!refreshToken) {
    clearIsLoginCookie(res);

    return sendResponse(res, 401, "success", "error", "Refresh token bị thiếu", "error_no_token");
  }

  const accessSecretKey = process.env.ACCESS_TOKEN_SECRET;
  const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET;
  jwt.verify(refreshToken, refreshSecretKey, async (err, user) => {
    if (!err) {
      const check = await checkMatchRefreshToken(refreshToken);
      if (!check) {
        clearIsLoginCookie(res);

        return sendResponse(res, 401, "success", "error", "Refresh token không khớp trong hệ thống", "error_mis_match");
      }
      jwt.verify(accessToken, accessSecretKey, async (err) => {
        if (!err) {
          req.user = user;
          next();
        } else {
          const newAccessToken = jwt.sign({ user }, accessSecretKey, { expiresIn: "1h" });

          res.cookie("accessToken", newAccessToken, {
            domain: process.env.NODE_ENV ? ".vercel.app" : "localhost",
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 3600 * 1000,
          });

          req.user = user;
          next();
        }
      });
    } else {
      clearIsLoginCookie(res);

      sendResponse(res, 401, "success", "error", "Refresh token không hợp lệ", "error_invalid_token");
    }
  });
}

async function checkMatchRefreshToken(refreshToken) {
  const client = await dbPool.connect();
  try {
    let result = await client.query("SELECT 1 FROM tbloginhistory WHERE refreshtoken = $1 and now() < expiredate ", [refreshToken]);
    if (result.rowCount == 1) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  } finally {
    client.release();
  }
}

export async function isPrivileged(req, res, next) {
  if (req.user.role == "admin" || req.user.role == "manager") {
    next();
  } else {
    clearIsLoginCookie(res);

    sendResponse(res, 403, "success", "error", "Không có quyền truy cập trang nay", "error_no_permission");
  }
}
