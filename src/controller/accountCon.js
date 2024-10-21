import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbPool } from "../services/database.js";
import moment from "../../node_modules/moment/moment.js";
import { generateRandomString, sendResponse, validateFields, getDatetimeNow, getPlusMinuteDateTime } from "../global/index.js";
import { sendEmail } from "../services/mailer.js";
import { driveCreateFolder, uploadVideoToDrive } from "../services/googledrive.js";

export async function createAccount(req, res) {
  const client = await dbPool.connect();
  try {
    const { username, password, displayname, email, phonenumber } = req.body;
    const error = validateFields({ username, password, displayname, email, phonenumber });
    if (error) {
      sendResponse(res, 400, "fail", error);
    }
    const userid = generateRandomString(8);
    const role = "customer";
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO tbuserinfo (userid, username, password, displayname, email, phonenumber, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [userid, username, hashedPassword, displayname, email, phonenumber, role]
    );
    await client.query("INSERT INTO tbloginhistory (userid) VALUES ($1)", [userid]);
    await client.query("INSERT INTO tbemailverification (userid) VALUES ($1)", [userid]);
    await client.query("INSERT INTO tbusersubscription (userid) VALUES ($1)", [userid]);
    await client.query("COMMIT");
    return sendResponse(res, 200, "success", "Account created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("[Create account] ", err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}
export async function logoutAccount(req, res) {
  const client = await dbPool.connect();
  try {
    const userid = req.user.info.userid;
    const logoutDate = getDatetimeNow();
    const result = await client.query("UPDATE tbloginhistory set logoutdate = $2 WHERE username = $1", [userid, logoutDate]);
    if (result.rowCount > 0) {
      res.cookie("accessToken", "", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        expires: new Date(0),
      });
      res.cookie("refreshToken", "", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        expires: new Date(0),
      });
      return sendResponse(res, 200, "success", "Logout successfully");
    }
  } catch (err) {
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function editAccountInfo(req, res) {
  const client = await dbPool.connect();
  try {
    const { displayname, email, phonenumber } = req.body;
    const error = validateFields({ displayname, email, phonenumber });
    if (error) {
      return sendResponse(res, 400, "fail", error);
    }
    const userid = req.user.userid;

    const result = await client.query("UPDATE tbuserinfo SET displayname = $2, email = $3, phonenumber = $4 WHERE userid = $1", [
      userid,
      displayname,
      email,
      phonenumber,
    ]);
    if (result.rowCount > 0) {
      return sendResponse(res, 200, "success", "Edit successfully");
    }
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function loginAccount(req, res) {
  const client = await dbPool.connect();
  try {
    const { username, password } = req.body;
    const error = validateFields({ username, password });
    if (error) {
      return sendResponse(res, 400, "fail", error);
    }

    const result = await client.query("SELECT * FROM tbuserinfo WHERE username = $1", [username]);

    if (result.rowCount == 0) {
      return sendResponse(res, 200, "fail", "Account not exist");
    }
    const user = result.rows[0];

    if (bcrypt.compareSync(password, user.password)) {
      const accessToken = jwt.sign({ userid: user.userid, role: user.role, isverified: user.isverified }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      const refreshToken = jwt.sign(
        { userid: user.userid, role: user.role, isverified: user.isverified },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 3600 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 86400 * 7 * 1000,
      });

      const requestip = req.ip || (req.headers["x-forwarded-for"] || "").split(",").pop().trim() || req.socket.remoteAddress;
      const logindate = getDatetimeNow();
      await client.query("UPDATE tbloginhistory SET useripaddress = $1, logindate = $2, refreshtoken = $3 WHERE userid = $4", [
        requestip,
        logindate,
        refreshToken,
        user.userid,
      ]);

      return sendResponse(res, 200, "success", "Login successfully");
    } else {
      return sendResponse(res, 200, "fail", "Login failed");
    }
  } catch (err) {
    console.log(err);
    return sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function changePassword(req, res) {
  const client = await dbPool.connect();
  try {
    const userid = req.user.userid;
    const { password, newpassword } = req.body;
    const error = validateFields({ password, newpassword });
    if (error) {
      return sendResponse(res, 200, "fail", error);
    }
    const result = await client.query("SELECT password FROM tbuserinfo WHERE userid = $1", [userid]);
    if (result) {
      let checkPassword = bcrypt.compareSync(password, result.rows[0].password);
      if (!checkPassword) {
        sendResponse(res, 200, "fail", "Current password is incorrect");
      } else {
        let newHashedPassword = await bcrypt.hash(newpassword, 10);
        const updateResult = await client.query("UPDATE tbuserinfo SET password = $2 WHERE userid = $1", [userid, newHashedPassword]);
        if (updateResult.rowCount > 0) {
          sendResponse(res, 200, "success", "Change password successfully");
        }
      }
    }
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function createEmailVerification(req, res) {
  const client = await dbPool.connect();
  try {
    const userid = req.user.userid;
    client.query("BEGIN");
    const result = await client.query("SELECT email FROM tbuserinfo WHERE userid = $1", [userid]);
    const useremail = result.rows[0].email;
    const emailToken = generateRandomString(12);
    const expiredDate = getPlusMinuteDateTime(5);
    const createddate = getDatetimeNow();
    await client.query("UPDATE tbemailverification SET emailtoken = $2, expireddate = $3, createddate = $4 WHERE userid = $1", [
      userid,
      emailToken,
      expiredDate,
      createddate,
    ]);
    await client.query("COMMIT");
    await sendEmail(
      useremail,
      "Email verification",
      `Your email verification token is ${emailToken}, it will expire in 5 minutes at ${expiredDate}!`
    );
    sendResponse(res, 200, "success", "Check your email for email verification token");
  } catch (err) {
    client.query("ROLLBACK");
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function verifyEmail(req, res) {
  const client = await dbPool.connect();
  try {
    const userid = req.user.userid;
    const { emailtoken } = req.body;
    const error = validateFields({ emailtoken });
    if (error) {
      return sendResponse(res, 200, "fail", error);
    }
    await client.query("BEGIN");
    const result = await client.query("SELECT emailtoken, expireddate FROM tbemailverification WHERE userid = $1", [userid]);
    if (result) {
      const datetimenow = getDatetimeNow();
      const exireddate = result.rows[0].expireddate;
      if (moment(datetimenow).isSameOrBefore(exireddate)) {
        if (result.rows[0].emailtoken == emailtoken) {
          const result2 = await client.query("Select email from tbuserinfo where userid = $1", [userid]);
          const useremail = result2.rows[0].email;
          await client.query("INSERT INTO tbpasswordreset (email) VALUES ($1)", [useremail]);
          await client.query("UPDATE tbuserinfo SET isverified = true WHERE userid = $1", [userid]);
          return sendResponse(res, 200, "success", "Email verification successfully");
        }
      } else return sendResponse(res, 200, "fail", "Email verification expired, please request a new one again");
    }
    await client.query("COMMIT");
  } catch (err) {
    console.log(err);
    client.query("ROLLBACK");
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function createResetPasswordToken(req, res) {
  const client = await dbPool.connect();
  try {
    const { email } = req.body;
    const error = validateFields({ email });
    if (error) {
      return sendResponse(res, 200, "fail", error);
    }
    const passwordResetToken = generateRandomString(18);
    const expiredDate = getPlusMinuteDateTime(5);
    const createddate = getDatetimeNow();
    const result = await client.query(
      "UPDATE tbpasswordreset SET passwordtoken = $2, expireddate = $3, createddate = $4 WHERE email = $1",
      [email, passwordResetToken, expiredDate, createddate]
    );
    if (result.rowCount > 0) {
      await sendEmail(
        email,
        "Password reset",
        `Your password reset link  is ${process.env.FRONTEND_URL}/passwordrecovery?token=${passwordResetToken}, it will expire in 5 minutes at ${expiredDate}!`
      );
      sendResponse(res, 200, "success", "Check your email for password reset link");
    } else {
      sendResponse(res, 200, "fail", "Email not found");
    }
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function checkResetPasswordToken(req, res) {
  const client = await dbPool.connect();
  try {
    const { passwordtoken } = req.body;
    const error = validateFields({ passwordtoken });
    if (error) {
      return sendResponse(res, 200, "fail", error);
    }
    const result = await client.query("SELECT expireddate FROM tbpasswordreset WHERE passwordtoken = $1", [passwordtoken]);
    if (result.rowCount > 0) {
      const datetimenow = getDatetimeNow();
      const exireddate = result.rows[0].expireddate;
      if (moment(datetimenow).isSameOrBefore(exireddate)) {
        return sendResponse(res, 200, "success", "Exist password reset token");
      } else return sendResponse(res, 200, "fail", "Expired password reset token");
    } else return sendResponse(res, 200, "fail", "Invalid password reset token");
  } catch (err) {
    console.log(err);
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}

export async function verifyResetPassword(req, res) {
  const client = await dbPool.connect();
  try {
    const { newpassword, passwordtoken } = req.body;
    const error = validateFields({ newpassword, passwordtoken });
    if (error) {
      return sendResponse(res, 200, "fail", error);
    }
    await client.query("BEGIN");
    const result = await client.query("SELECT email, expireddate FROM tbemailverification WHERE passwordtoken = $1", [passwordtoken]);
    if (result) {
      const datetimenow = getDatetimeNow();
      const exireddate = result.rows[0].expireddate;
      if (moment(datetimenow).isSameOrBefore(exireddate)) {
        let hashedpassword = await bcrypt.hash(newpassword, 10);
        await client.query("UPDATE tbuserinfo SET password = $1 WHERE email = $2", [hashedpassword, result.rows[0].email]);
        return sendResponse(res, 200, "success", "Reset password successfully");
      } else return sendResponse(res, 200, "fail", "Reset password expired, please request a new one again");
    }
    await client.query("COMMIT");
  } catch (err) {
    console.log(err);
    client.query("ROLLBACK");
    sendResponse(res, 500, "fail", "Internal Server Error");
  } finally {
    client.release();
  }
}
