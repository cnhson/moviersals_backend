import jwt from "jsonwebtoken";
import { sendResponse } from "../util/index.js";
import { dbPool } from "../services/database.js";

export async function authenticateJWT(req, res, next) {
  if (!req.cookies) {
    return sendResponse(res, 401, "success", "error", "No cookies found");
  }

  const { accessToken, refreshToken } = req.cookies;

  if (!refreshToken) {
    return sendResponse(res, 200, "success", "error", "Refresh token is missing");
  }

  const accessSecretKey = process.env.ACCESS_TOKEN_SECRET;
  const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET;
  jwt.verify(refreshToken, refreshSecretKey, async (err, user) => {
    if (!err) {
      const check = await checkValidRefreshToken(refreshToken, user.userid);
      if (!check) {
        return sendResponse(res, 401, "success", "error", "Invalid refreshToken");
      }
      jwt.verify(accessToken, accessSecretKey, async (err) => {
        if (!err) {
          req.user = user;
          next();
        } else {
          const newAccessToken = jwt.sign({ user }, accessSecretKey, { expiresIn: "1h" });

          res.cookie("accessToken", newAccessToken, {
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
      sendResponse(res, 401, "success", "error", "Unknown refreshToken");
    }
  });
}

async function checkValidRefreshToken(refreshToken, userid) {
  const client = await dbPool.connect();
  try {
    let result = await client.query("SELECT refreshToken FROM tbloginhistory WHERE userid = $1 and now() < expiredate ", [userid]);
    if (result.rowCount > 0) {
      if (result.rows[0].refreshtoken == refreshToken) {
        return true;
      }
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
    sendResponse(res, 403, "success", "success", "No permissions to access requested resource");
  }
}
