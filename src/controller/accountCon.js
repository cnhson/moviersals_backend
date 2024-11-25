import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "../../node_modules/moment/moment.js";
import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
  createToken,
  getReqIpAddress,
} from "../util/index.js";
import { sendEmail } from "../services/mailer.js";
import { accountSchema } from "../schema/index.js";
import { uploadCloudImage } from "../services/cloudinary.js";

export const createAccount = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.createAccountParams);
  const role = "customer";
  const hashedPassword = await bcrypt.hash(params.password, 10);
  const result = await client.query(
    "INSERT INTO tbuserinfo (username, password, displayname, email, phonenumber, role) VALUES ($1, $2, $3, $4, $5, $6)",
    [params.username, hashedPassword, params.displayname, params.email, params.phonenumber, role]
  );
  const userid = result.rows[0].id;
  await client.query("INSERT INTO tbloginhistory (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbemailverification (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbusersubscription (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbfavouritelist (userid) VALUES ($1)", [userid]);

  return sendResponse(res, 200, "success", "Account created successfully");
});

export const logoutAccount = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  console.log(req.user);
  const logoutDate = getStringDatetimeNow();
  const result = await client.query("UPDATE tbloginhistory set expiredate = null,refreshtoken = null, logoutdate = $2 where userid = $1", [
    userid,
    logoutDate,
  ]);
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
  } else return sendResponse(res, 200, "success", "Logout failed");
});

export const editAccountInfo = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.editAccountParams);
  const userid = req.user.userid;
  const imageUrl = await uploadCloudImage(req.file);
  const modifiedDateTime = getStringDatetimeNow();
  const result = await client.query(
    "UPDATE tbuserinfo SET displayname = $2, email = $3, phonenumber = $4, thumbnail = $5, modifieddate = $6 where id = $1",
    [userid, params.displayname, params.email, params.phonenumber, imageUrl, modifiedDateTime]
  );
  if (result.rowCount > 0) return sendResponse(res, 200, "success", "Edit successfully");
  return sendResponse(res, 200, "success", "Edit failed");
});

export const loginAccount = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.loginAccountParams);
  const requestip = getReqIpAddress(req);
  console.log(requestip);
  const activecheck = await client.query('select "isactive" = false as check from tbuserinfo t where t.username = $1', [params.username]);
  if (activecheck.rows[0].check) return sendResponse(res, 200, "success", "Account is locked");
  const result = await client.query("SELECT * FROM tbuserinfo WHERE username = $1", [params.username]);
  if (result.rowCount == 0) {
    return sendResponse(res, 200, "success", "Account not exist");
  }
  const user = result.rows[0];
  if (bcrypt.compareSync(params.password, user.password)) {
    let accessToken, refreshToken;

    accessToken = jwt.sign({ userid: user.id, role: user.role, isverified: user.isverified }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });
    refreshToken = jwt.sign({ userid: user.id, role: user.role, isverified: user.isverified }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    createToken(res, "accessToken", accessToken, 3600 * 1000);
    createToken(res, "refreshToken", refreshToken, 86400 * 7 * 1000);

    const loginDate = getStringDatetimeNow();
    const expireDate = getExtendDatetime(7, 0, 0);
    await client.query(
      "UPDATE tbloginhistory SET useripaddress = $2, logindate = $3, refreshtoken = $4, expiredate = $5 where userid = $1",
      [user.userid, requestip, loginDate, refreshToken, expireDate]
    );
    return sendResponse(res, 200, "success", "Login successfully");
  } else {
    return sendResponse(res, 200, "success", "Login failed");
  }
});

export const changePassword = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const params = preProcessingBodyParam(req, accountSchema.changePasswordParams);

  const result = await client.query("SELECT password FROM tbuserinfo where id = $1", [userid]);
  if (result) {
    let checkPassword = bcrypt.compareSync(params.oldpassword, result.rows[0].password);
    if (!checkPassword) {
      sendResponse(res, 200, "success", "Current password is incorrect");
    } else {
      let newHashedPassword = await bcrypt.hash(params.newpassword, 10);
      const updateResult = await client.query("UPDATE tbuserinfo SET password = $2 where id = $1", [userid, newHashedPassword]);
      if (updateResult.rowCount > 0) {
        sendResponse(res, 200, "success", "Change password successfully");
      }
    }
  }
});

export const createEmailVerification = errorHandlerTransaction(async (req, res, next, client) => {
  const userid = req.user.userid;
  const result = await client.query("SELECT email FROM tbuserinfo where id = $1", [userid]);
  const useremail = result.rows[0].email;
  const emailToken = generateRandomString(12);
  const expiredDate = getExtendDatetime(0, 0, 5);
  const createdDateTime = getStringDatetimeNow();
  await client.query("UPDATE tbemailverification SET emailtoken = $2, expireddate = $3, createdDateTime =  $4 where id = $1", [
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
  const params = preProcessingBodyParam(req, accountSchema.verifyEmailParams);

  const result = await client.query("SELECT emailtoken, expireddate FROM tbemailverification where id = $1", [userid]);
  if (result) {
    const datetimenow = getStringDatetimeNow();
    const exireddate = result.rows[0].expireddate;
    if (moment(datetimenow).isSameOrBefore(exireddate)) {
      if (result.rows[0].emailtoken == params.emailtoken) {
        const result2 = await client.query("Select email from tbuserinfo where userid = $1", [userid]);
        const useremail = result2.rows[0].email;
        await client.query("INSERT INTO tbpasswordreset (email) VALUES ($1)", [useremail]);
        await client.query("UPDATE tbuserinfo SET isverified = true where id = $1", [userid]);
        return sendResponse(res, 200, "success", "Email verification successfully");
      }
    } else return sendResponse(res, 200, "success", "Email verification expired, please request a new one again");
  }
});

export const createResetPasswordToken = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.createResetPasswordToken);

  const passwordResetToken = generateRandomString(18);
  const expiredDate = getExtendDatetime(0, 0, 5);
  const createdDateTime = getStringDatetimeNow();
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
    sendResponse(res, 200, "success", "Email not found");
  }
});

export const checkResetPasswordToken = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.checkResetPasswordToken);
  const result = await client.query("SELECT expireddate FROM tbpasswordreset WHERE passwordtoken = $1", [params.passwordtoken]);
  if (result.rowCount > 0) {
    const datetimenow = getStringDatetimeNow();
    const exireddate = result.rows[0].expireddate;
    if (moment(datetimenow).isSameOrBefore(exireddate)) {
      return sendResponse(res, 200, "success", "Exist password reset token");
    } else return sendResponse(res, 200, "success", "Expired password reset token");
  } else return sendResponse(res, 200, "success", "Invalid password reset token");
});

export const verifyResetPassword = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.checkResetPasswordToken);
  const result = await client.query("SELECT email, expireddate FROM tbemailverification WHERE passwordtoken = $1", [params.passwordtoken]);
  if (result) {
    const datetimenow = getStringDatetimeNow();
    const exireddate = result.rows[0].expireddate;
    if (moment(datetimenow).isSameOrBefore(exireddate)) {
      let hashedpassword = await bcrypt.hash(params.newpassword, 10);
      await client.query("UPDATE tbuserinfo SET password = $1 WHERE email = $2", [hashedpassword, result.rows[0].email]);
      return sendResponse(res, 200, "success", "Reset password successfully");
    } else return sendResponse(res, 200, "success", "Reset password expired, please request a new one again");
  }
});

export const getAllUser_ = errorHandler(async (req, res, next, client) => {
  const result = await client.query(
    "SELECT id,username,displayname,email,phonenumber,membership,role,createddate,isverified,isactive FROM tbuserinfo WHERE role != 'admin'"
  );
  return sendResponse(res, 200, "success", result.rows);
});

export const checkAuthenciation = errorHandler(async (req, res, next, client) => {
  const result = await client.query(
    "SELECT id,username,displayname,email,phonenumber,membership,role,createddate,isverified, thumbnail FROM tbuserinfo where id = $1",
    [req.user.userid]
  );
  return sendResponse(res, 200, "success", result.rows[0]);
});
