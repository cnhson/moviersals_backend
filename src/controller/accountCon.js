import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
  getConvertedDatetime,
  getDatetimeNow,
  getInputExtendDatetime,
  getQueryOffset,
  getPageSize,
  getTotalPages,
  isTokenExpired,
  setIsLoginCookie,
  clearIsLoginCookie,
} from "../util/index.js";
import { sendEmail } from "../services/mailer.js";
import { accountSchema } from "../schema/index.js";
import { uploadCloudImage } from "../services/cloudinary.js";

export const createAccount = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.createAccountParams);

  const exist = await client.query("Select username, email from tbuserinfo where username = $1 or email = $2", [
    params.username,
    params.email,
  ]);
  if (exist.rows[0]?.username == params.username) return sendResponse(res, 200, "success", "error", "Tên đăng nhập đã được sử dụng");
  else if (exist.rows[0]?.email == params.email) return sendResponse(res, 200, "success", "error", "Email đã được sử dụng");

  const role = "customer";
  const hashedPassword = await bcrypt.hash(params.password, 10);
  const createddate = getStringDatetimeNow();

  const result = await client.query(
    "INSERT INTO tbuserinfo (username, password, displayname, email, phonenumber, role, ispremium, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [params.username, hashedPassword, params.displayname, params.email, params.phonenumber, role, false, createddate]
  );
  const userid = result.rows[0].id;
  await client.query("INSERT INTO tbloginhistory (userid) VALUES ($1)", [userid]);
  await client.query("INSERT INTO tbpasswordreset (userid, email) VALUES ($1, $2)", [userid, params.email]);
  await client.query("INSERT INTO tbemailverification (userid, email) VALUES ($1, $2)", [userid, params.email]);
  await client.query("INSERT INTO tbusersubscription (userid, subcriptionid) VALUES ($1,'FREE')", [userid]);

  return sendResponse(res, 200, "success", "success", "Tạo tài khoản thành công");
});

export const logoutAccount = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const logoutDate = getStringDatetimeNow();
  await client.query("UPDATE tbloginhistory set expiredate = null,refreshtoken = null, logoutdate = $2 where userid = $1", [
    userid,
    logoutDate,
  ]);
  res.cookie("accessToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    expires: new Date(0),
  });
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    expires: new Date(0),
  });
  return sendResponse(res, 200, "success", "success", "Đăng xuất thành công");
});

export const editAccountInfo = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.editAccountParams);
  const userid = req.user.userid;
  let imageUrl = null;
  if (req.file) imageUrl = await uploadCloudImage(req.file);

  const emailCheck = await client.query("SELECT email FROM tbuserinfo WHERE id = $1", [userid]);
  if (emailCheck.rows[0].email != params.email) {
    await client.query(`   UPDATE tbemailverification SET email = $2 WHERE userid = $1 `, [userid, params.email]);
    await client.query(`   UPDATE tbpasswordreset SET email = $2 WHERE userid = $1`, [userid, params.email]);
    await client.query(`   UPDATE tbuserinfo SET email = $2 WHERE id = $1 `, [userid, params.email]);
  }
  const modifiedDateTime = getStringDatetimeNow();
  const result = await client.query(
    `UPDATE tbuserinfo 
      SET 
      displayname = $2, 
      email = $3, 
      phonenumber = $4, 
      thumbnail = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE thumbnail END, 
      modifieddate = $6 
    WHERE id = $1`,
    [userid, params.displayname, params.email, params.phonenumber, imageUrl, modifiedDateTime]
  );
  if (result.rowCount > 0) return sendResponse(res, 200, "success", "success", "Chỉnh sửa thông tin thành công");
  return sendResponse(res, 200, "success", "error", "Chỉnh sửa thông tin thất bại");
});

export const loginAccount = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.loginAccountParams);
  const requestip = getReqIpAddress(req);
  const activecheck = await client.query('select "isactive" = false as check from tbuserinfo t where t.username = $1', [params.username]);
  if (activecheck.rows[0]?.check)
    return sendResponse(
      res,
      403,
      "success",
      "error",
      "Account is disable, please contact our website for more information",
      "error_disable_account"
    );
  const result = await client.query("SELECT * FROM tbuserinfo WHERE username = $1", [params.username]);
  if (result.rowCount == 0) {
    return sendResponse(res, 200, "success", "error", "Tên đăng nhập không tồn tài");
  }
  const user = result.rows[0];
  if (bcrypt.compareSync(params.password, user.password)) {
    let accessToken, refreshToken;
    const newRefreshToken = jwt.sign({ userid: user.id, role: user.role, isverified: user.isverified }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    const storeinfo = await client.query("select refreshtoken from tbloginhistory where userid = $1", [user.id]);
    const subcriptionconfig = await client.query(
      `select t2.connection  from tbusersubscription t join tbsubcriptionplaninfo t2 
      on t.subcriptionid = t2.subcriptionid where t.userid = $1`,
      [user.id]
    );
    const maxconnection = Number(subcriptionconfig.rows[0].connection);

    let storedRefreshToken = storeinfo.rows[0].refreshtoken;
    if (isTokenExpired(storedRefreshToken)) {
      storedRefreshToken = newRefreshToken;
    }
    // get logined ip address array
    const ipaddresslist = await client.query("select useripaddress from tbloginhistory where userid = $1", [user.id]);
    let ipaddressArray = ipaddresslist.rows[0].useripaddress;

    if (ipaddressArray == null || ipaddressArray.length == 0 || storedRefreshToken == null) {
      // if ipaddress array is null or refresh token is null
      refreshToken = newRefreshToken;
      ipaddressArray = [requestip];
    } else if (ipaddressArray.length == maxconnection) {
      // if ipaddress array is full and request ip is in ipaddress array
      if (ipaddressArray.includes(requestip)) refreshToken = storedRefreshToken;
      else {
        /* if ipaddress array is full and request ip is not in ipaddress array, there are no more slots for this user, 
        then generate new refresh token and clear all user ipaddress */
        refreshToken = newRefreshToken;
        ipaddressArray = [];
        ipaddressArray.push(requestip);
      }
    } else if (ipaddressArray.length > maxconnection) {
      refreshToken = newRefreshToken;
      ipaddressArray = [];
      ipaddressArray.push(requestip);
    } else {
      refreshToken = storedRefreshToken;
      if (!ipaddressArray.includes(requestip)) {
        // if ipaddress array is not full and request ip is not in array
        ipaddressArray.push(requestip);
      }
    }

    accessToken = jwt.sign({ userid: user.id, role: user.role, isverified: user.isverified }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    createToken(res, "accessToken", accessToken, 3600 * 1000);
    createToken(res, "refreshToken", refreshToken, 86400 * 7 * 1000);

    const loginDate = getStringDatetimeNow();
    const expireDate = getExtendDatetime(7, 0, 0);
    await client.query(
      "UPDATE tbloginhistory SET useripaddress = $2, logindate = $3, refreshtoken = $4, expiredate = $5 where userid = $1",
      [user.id, ipaddressArray, loginDate, refreshToken, expireDate]
    );

    setIsLoginCookie(res);

    return sendResponse(res, 200, "success", "success", "Đăng nhập thành công");
  } else {
    return sendResponse(res, 200, "success", "error", "Sai mật khẩu");
  }
});

export const changePassword = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const params = preProcessingBodyParam(req, accountSchema.changePasswordParams);

  const result = await client.query("SELECT password FROM tbuserinfo where id = $1", [userid]);
  if (result) {
    let checkPassword = bcrypt.compareSync(params.oldpassword, result.rows[0].password);
    if (!checkPassword) {
      sendResponse(res, 200, "success", "error", "Mật khẩu chưa chính xác");
    } else {
      let newHashedPassword = await bcrypt.hash(params.newpassword, 10);
      const updateResult = await client.query("UPDATE tbuserinfo SET password = $2 where id = $1", [userid, newHashedPassword]);
      if (updateResult.rowCount > 0) {
        sendResponse(res, 200, "success", "success", "Đổi mật khẩu thành công");
      }
    }
  }
});

export const createEmailVerification = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.createEmailVerificationParams);
  const userid = req.user.userid;
  const result = await client.query("SELECT * FROM tbemailverification where userid = $1", [userid]);
  const tokenexpiredate = getConvertedDatetime(result.rows[0].expiredate);
  if (getDatetimeNow().isSameOrBefore(tokenexpiredate))
    return sendResponse(res, 200, "success", "error", "Token chỉ có thể tạo mới mỗi 5 phút 1 lần");

  const emailToken = generateRandomString(12);
  const expireDate = getExtendDatetime(0, 0, 5);
  const createdDateTime = getStringDatetimeNow();

  await client.query("UPDATE tbemailverification SET emailtoken = $3, expiredate = $4, createddate = $5 where userid = $1 and email = $2", [
    userid,
    params.email,
    emailToken,
    expireDate,
    createdDateTime,
  ]);
  await sendEmail(
    params.email,
    "[Thông báo] Xác nhận Email",
    `Mã xác nhận email của quý khách là ${emailToken}, nó sẽ hết hạn 5 phút nữa vào lúc ${expireDate}!\nNếu quý khách không phải là người yêu cầu hành động trên, hay bỏ qua email này`
  );
  sendResponse(res, 200, "success", "success", "Vui lòng kiểm tra email để lấy token");
});

export const verifyEmail = errorHandler(async (req, res, next, client) => {
  const userid = req.user.userid;
  const params = preProcessingBodyParam(req, accountSchema.verifyEmailVerificationParams);

  const result = await client.query("SELECT emailtoken, expiredate FROM tbemailverification where userid = $1 and email = $2", [
    userid,
    params.email,
  ]);
  if (result) {
    const exireddate = result.rows[0].expiredate;
    if (getDatetimeNow().isSameOrBefore(exireddate)) {
      if (result.rows[0].emailtoken == params.emailtoken) {
        await client.query("UPDATE tbuserinfo SET isverified = true where id = $1 and email = $2", [userid, params.email]);
        await client.query("UPDATE tbemailverification set emailtoken = null, expiredate = null where userid = $1 and email = $2", [
          userid,
          params.email,
        ]);
        return sendResponse(res, 200, "success", "success", "Xác nhận email thành công");
      }
    } else return sendResponse(res, 200, "success", "error", "Token đã hết hạn, vui lòng yêu cầu cái mới");
  }
});

export const createResetPasswordToken = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.createResetPasswordToken);

  const previouscheck = await client.query("SELECT * FROM tbpasswordreset WHERE email = $1", [params.email]);
  if (previouscheck.rowCount == 0) {
    return sendResponse(res, 200, "success", "error", "Email không tồn tại ở bất kỳ tài khoản nào");
  }
  const oldexpiredatetime = getConvertedDatetime(previouscheck.rows[0].expiredate);

  if (getDatetimeNow().isBefore(oldexpiredatetime))
    return sendResponse(res, 200, "success", "error", "Quý khách chỉ có thể yêu cầu token đặt lại mật khẩu mỗi 5 phút 1 lần");

  const passwordResetToken = generateRandomString(30);
  const expireDate = getExtendDatetime(0, 0, 5);
  const createdDateTime = getStringDatetimeNow();
  const result = await client.query("UPDATE tbpasswordreset SET passwordtoken = $2, expiredate = $3, createddate = $4 WHERE email = $1", [
    params.email,
    passwordResetToken,
    expireDate,
    createdDateTime,
  ]);
  if (result.rowCount > 0) {
    await sendEmail(
      params.email,
      "[Thông báo] Đặt lại mật khẩu",
      `Đường dẫn đặt lại mất khẩu của quý khách là ${process.env.FRONTEND_URL}/passwordrecovery/confirm?token=${passwordResetToken} , nó sẽ hết hạn 5 phút nữa vào lúc ${expireDate}!\nNếu quý khách không phải là người yêu cầu hành động trên, hay bỏ qua email này`
    );
    sendResponse(res, 200, "success", "success", "Hãy kiểm tra email để nhận đường dẫn");
  } else {
    sendResponse(res, 200, "success", "error", "Không tìm thấy email trong hệ thống");
  }
});

export const checkResetPasswordToken = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.checkResetPasswordToken);
  const result = await client.query("SELECT expiredate FROM tbpasswordreset WHERE passwordtoken = $1", [params.passwordtoken]);
  if (result.rowCount > 0) {
    const exireddate = result.rows[0].expiredate;
    if (getDatetimeNow().isSameOrBefore(exireddate)) {
      return sendResponse(res, 200, "success", "success", "Đã tìm thấy token đặt lại mật khẩu");
    } else return sendResponse(res, 200, "success", "error", "Token đặt lại mật khẩu đã hết hạn");
  } else return sendResponse(res, 200, "success", "error", "Token đặt lại mật khẩu không hợp lệ");
});

export const verifyResetPassword = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.verifyResetPassword);
  const result = await client.query("SELECT email, expiredate FROM tbpasswordreset WHERE passwordtoken = $1", [params.passwordtoken]);
  if (result) {
    const exireddate = result.rows[0].expiredate;
    if (getDatetimeNow().isSameOrBefore(exireddate)) {
      let hashedpassword = await bcrypt.hash(params.newpassword, 10);

      await client.query(`UPDATE tbuserinfo SET password = $1 WHERE email = $2`, [hashedpassword, result.rows[0].email]);
      await client.query("UPDATE tbpasswordreset SET passwordtoken = null, expiredate = null, createddate = null WHERE email = $1", [
        result.rows[0].email,
      ]);
      return sendResponse(res, 200, "success", "success", "Đặt lại mật khẩu thành công");
    } else return sendResponse(res, 200, "success", "error", "Token đã hết hạn, vui lòng yêu cầu cái mới");
  }
});

export const getAllUser_ = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query(
    `WITH base_data AS (
       SELECT id,username,displayname,email,phonenumber,ispremium,role,createddate,isverified,isactive FROM tbuserinfo WHERE role != 'admin'
      ),
      total AS (
        SELECT COUNT(*) AS total_count FROM base_data
      ),
      data AS (
        SELECT * FROM base_data
        LIMIT $1 OFFSET $2
      )
      SELECT (SELECT total_count FROM total) AS total_count, json_agg(data) AS rows
      FROM data;`,
    [size, offset]
  );

  const totalPagges = getTotalPages(result.rows[0].total_count);
  const object = { list: result.rows[0].rows, total: totalPagges };

  return sendResponse(res, 200, "success", "success", object);
});

export const checkAuthenciation = errorHandlerTransaction(async (req, res, next, client) => {
  const userid = req.user.userid;
  const userip = getReqIpAddress(req);

  const check = await client.query("select * from tbloginhistory t where t.useripaddress @> Array[$1] and t.userid = $2", [userip, userid]);

  if (check.rowCount == 0) {
    clearIsLoginCookie(res);
    return sendResponse(res, 200, "success", "error", null);
  }

  const premiumCheck = await client.query(
    `   SELECT EXISTS ( SELECT 1 FROM tbusersubscription t where t.usingend > NOW() and isactive = true and t.userid = $1 ) AS ispremium, 
   usingend from tbusersubscription t2 where t2.userid = $1`,
    [userid]
  );

  await client.query("update tbuserinfo set ispremium = " + premiumCheck.rows[0].ispremium + " where id = $1", [userid]);
  if (premiumCheck.rows[0].usingend != null && premiumCheck.rows[0].ispremium == false) {
    await client.query("update tbusersubscription set subcriptionid = 'FREE' where userid = $1", [userid]);
  }

  const result = await client.query(
    `SELECT id,username,displayname,email,phonenumber,ispremium,role,createddate,ispremium,isverified,t2.subcriptionid,thumbnail, t2.usingend 
    FROM tbuserinfo t
    join tbusersubscription t2 
    on t.id::text = t2.userid where id = $1`,
    [req.user.userid]
  );

  setIsLoginCookie(res);
  return sendResponse(res, 200, "success", "success", result.rows[0]);
});

export const changeAccountState = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, accountSchema.changeAccountActiveState_Params);
  let stringMsg = "Khóa";
  if (params.isactive == true) stringMsg = "Mở khóa";

  await client.query("UPDATE tbuserinfo set isactive = $3 where id = $1 and username = $2", [params.id, params.username, params.isactive]);

  return sendResponse(res, 200, "success", "success", stringMsg + " tài khoản thành công");
});

export const getAccountSubscription = errorHandler(async (req, res, next, client) => {
  const data = await client.query(
    "SELECT t.*, t2.priority, t2.name from tbusersubscription t join tbsubcriptionplaninfo t2 on t.subcriptionid = t2.subcriptionid where t.userid = $1",
    [req.user.userid]
  );

  return sendResponse(res, 200, "success", "success", data.rows[0]);
});
