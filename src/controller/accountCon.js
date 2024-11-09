import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "../../node_modules/moment/moment.js";
import {
  generateRandomString,
  sendResponse,
  getDatetimeNow,
  getPlusMinuteDateTime,
  errorHandlerTransaction,
  errorHandler,
  preProcessing,
} from "../global/index.js";
import { sendEmail } from "../services/mailer.js";
import { driveCreateFolder, uploadVideoToDrive } from "../services/googledrive.js";
import { accountSchema } from "../schema/index.js";

export const createAccount = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessing(req, accountSchema.createAccountParams);

  const userid = generateRandomString(8);
  const role = "customer";
  const hashedPassword = await bcrypt.hash(params.password, 10);
  await client.query(
    "INSERT INTO tbuserinfo (userid, username, password, displayname, email, phonenumber, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [userid, params.username, hashedPassword, params.displayname, params.email, params.phonenumber, role]
  );
  await client.query("INSERT INTO tbloginhistory (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbemailverification (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbusersubscription (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbfavouritelist (userid) VALUES ($1)", [userid]);

  return sendResponse(res, 200, "success", "Account created successfully");
});

export const logoutAccount = errorHandler(async (req, res, next, client) => {
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
});

export const editAccountInfo = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, accountSchema.editAccountParams);

  const userid = req.user.userid;

  const result = await client.query("UPDATE tbuserinfo SET displayname = $2, email = $3, phonenumber = $4 WHERE userid = $1", [
    userid,
    params.displayname,
    params.email,
    params.phonenumber,
  ]);
  if (result.rowCount > 0) {
    return sendResponse(res, 200, "success", "Edit successfully");
  }
});

export const loginAccount = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, accountSchema.loginAccountParams);
  const ipaddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("ip: " + ipaddress);

  const result = await client.query("SELECT * FROM tbuserinfo WHERE username = $1", [params.username]);
  if (result.rowCount == 0) {
    return sendResponse(res, 200, "fail", "Account not exist");
  }
  const user = result.rows[0];
  if (bcrypt.compareSync(params.password, user.password)) {
    const accessToken = jwt.sign({ userid: user.userid, role: user.role, isverified: user.isverified }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ userid: user.userid, role: user.role, isverified: user.isverified }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });
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
});

export const changePassword = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const params = preProcessing(req, accountSchema.changePasswordParams);

  const result = await client.query("SELECT password FROM tbuserinfo WHERE userid = $1", [userid]);
  if (result) {
    let checkPassword = bcrypt.compareSync(params.oldpassword, result.rows[0].password);
    if (!checkPassword) {
      sendResponse(res, 200, "fail", "Current password is incorrect");
    } else {
      let newHashedPassword = await bcrypt.hash(params.newpassword, 10);
      const updateResult = await client.query("UPDATE tbuserinfo SET password = $2 WHERE userid = $1", [userid, newHashedPassword]);
      if (updateResult.rowCount > 0) {
        sendResponse(res, 200, "success", "Change password successfully");
      }
    }
  }
});

export const createEmailVerification = errorHandlerTransaction(async (req, res, next, client) => {
  const userid = req.user.userid;
  const result = await client.query("SELECT email FROM tbuserinfo WHERE userid = $1", [userid]);
  const useremail = result.rows[0].email;
  const emailToken = generateRandomString(12);
  const expiredDate = getPlusMinuteDateTime(5);
  const createdDateTime = getDatetimeNow();
  await client.query("UPDATE tbemailverification SET emailtoken = $2, expireddate = $3, createdDateTime =  $4 WHERE userid = $1", [
    userid,
    emailToken,
    expiredDate,
    createdDateTime,
  ]);
  await sendEmail(
    useremail,
    "Email verification",
    `Your email verification token is ${emailToken}, it will expire in 5 minutes at ${expiredDate}!`
  );
  sendResponse(res, 200, "success", "Check your email for email verification token");
});

export const verifyEmail = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const params = preProcessing(req, accountSchema.verifyEmailParams);

  const result = await client.query("SELECT emailtoken, expireddate FROM tbemailverification WHERE userid = $1", [userid]);
  if (result) {
    const datetimenow = getDatetimeNow();
    const exireddate = result.rows[0].expireddate;
    if (moment(datetimenow).isSameOrBefore(exireddate)) {
      if (result.rows[0].emailtoken == params.emailtoken) {
        const result2 = await client.query("Select email from tbuserinfo where userid = $1", [userid]);
        const useremail = result2.rows[0].email;
        await client.query("INSERT INTO tbpasswordreset (email) VALUES ($1)", [useremail]);
        await client.query("UPDATE tbuserinfo SET isverified = true WHERE userid = $1", [userid]);
        return sendResponse(res, 200, "success", "Email verification successfully");
      }
    } else return sendResponse(res, 200, "fail", "Email verification expired, please request a new one again");
  }
});

export const createResetPasswordToken = errorHandler(async (req, res, next, client) => {
  const params = preProcessing(req, accountSchema.createResetPasswordToken);

  const passwordResetToken = generateRandomString(18);
  const expiredDate = getPlusMinuteDateTime(5);
  const createdDateTime = getDatetimeNow();
  const result = await client.query(
    "UPDATE tbpasswordreset SET passwordtoken = $2, expireddate = $3, createdDateTime =  $4 WHERE email = $1",
    [params.email, passwordResetToken, expiredDate, createdDateTime]
  );
  if (result.rowCount > 0) {
    await sendEmail(
      params.email,
      "Password reset",
      `Your password reset link  is ${process.env.FRONTEND_URL}/passwordrecovery?token=${passwordResetToken}, it will expire in 5 minutes at ${expiredDate}!`
    );
    sendResponse(res, 200, "success", "Check your email for password reset link");
  } else {
    sendResponse(res, 200, "fail", "Email not found");
  }
});

export const checkResetPasswordToken = errorHandler(async (req, res, next, client) => {
  errorHandler(async (req, res, next, client) => {
    const params = preProcessing(req, accountSchema.checkResetPasswordToken);
    const result = await client.query("SELECT expireddate FROM tbpasswordreset WHERE passwordtoken = $1", [params.passwordtoken]);
    if (result.rowCount > 0) {
      const datetimenow = getDatetimeNow();
      const exireddate = result.rows[0].expireddate;
      if (moment(datetimenow).isSameOrBefore(exireddate)) {
        return sendResponse(res, 200, "success", "Exist password reset token");
      } else return sendResponse(res, 200, "fail", "Expired password reset token");
    } else return sendResponse(res, 200, "fail", "Invalid password reset token");
  });
});

export const verifyResetPassword = errorHandler(async (req, res, next, client) => {
  errorHandlerTransaction(async (req, res, next, client) => {
    const params = preProcessing(req, accountSchema.checkResetPasswordToken);
    const result = await client.query("SELECT email, expireddate FROM tbemailverification WHERE passwordtoken = $1", [
      params.passwordtoken,
    ]);
    if (result) {
      const datetimenow = getDatetimeNow();
      const exireddate = result.rows[0].expireddate;
      if (moment(datetimenow).isSameOrBefore(exireddate)) {
        let hashedpassword = await bcrypt.hash(params.newpassword, 10);
        await client.query("UPDATE tbuserinfo SET password = $1 WHERE email = $2", [hashedpassword, result.rows[0].email]);
        return sendResponse(res, 200, "success", "Reset password successfully");
      } else return sendResponse(res, 200, "fail", "Reset password expired, please request a new one again");
    }
  });
});
