import jwt from "jsonwebtoken";
import { sendResponse } from "../global/index.js";
import { dbPool } from "../services/database.js";

export async function authenticateJWT(req, res, next) {
  if (!req.cookies) {
    return sendResponse(res, 401, "success", "No cookies found");
  }

  const { accessToken, refreshToken } = req.cookies;

  if (!refreshToken) {
    return sendResponse(res, 401, "success", "Refresh token is missing");
  }

  const accessSecretKey = process.env.ACCESS_TOKEN_SECRET;
  const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET;
  jwt.verify(accessToken, accessSecretKey, async (err, user) => {
    if (err) {
      jwt.verify(refreshToken, refreshSecretKey, (err, user) => {
        if (err) {
          return sendResponse(res, 401, "success", "Invalid Token");
        } else {
          const accessToken = jwt.sign({ user }, accessSecretKey, { expiresIn: "1h" });

          res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 3600 * 1000,
          });
        }
        req.user = user;

        next();
      });
    } else {
      req.user = user;
      const checkValid = await checkValidRefreshToken(refreshToken, user.userid);
      if (checkValid) next();
      else {
        sendResponse(res, 401, "success", "Invalid refreshToken");
      }
    }
  });
}

async function checkValidRefreshToken(refreshToken, userid) {
  const client = await dbPool.connect();
  try {
    let result = await client.query("SELECT refreshToken FROM tbloginhistory WHERE userid = $1", [userid]);
    if (result.rows.length > 0) {
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
    sendResponse(res, 403, "success", "No permissions to access requested resource");
  }
}
