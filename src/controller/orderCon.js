import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
  getInputExtendDatetime,
  queryStringify,
  sortObject,
  getSignatureKey,
} from "../util/index.js";
import { sendEmail } from "../services/mailer.js";
import { orderSchema } from "../schema/index.js";
import moment from "moment";

export const createPaypalOrder = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.createPaypalOrderParams);
  const userid = req.user.userid;
  const createddate = getStringDatetimeNow();
  const orderid = "OD" + generateRandomString(20);
  const paypalorderid = "PAYPAL_" + generateRandomString(20);
  const subcriptioninfo = await client.query("select * from tbsubcriptionplaninfo where subcriptionid = $1", [params.subcriptionid]);
  if (subcriptioninfo.rowCount == 1) {
    const duration = subcriptioninfo.rows[0].daysduration;

    const usersubcription = await client.query("select usingend from tbusersubscription where userid = $1", [userid]);

    const expireddate = getInputExtendDatetime(usersubcription.rows[0].usingend, duration, 0);

    await client.query(
      "insert into tborderhistory (orderid, userid, subcriptionid, paymentmethod, paymentid, createddate) VALUES ($1, $2, $3, $4, $5, $6)",
      [orderid, userid, params.subcriptionid, "PAYPAL", paypalorderid, createddate]
    );
    await client.query(
      "insert into tbpaypalpayment (id,  paymentid,  email, payerid, amount, createddate) VALUES ($1, $2, $3, $4, $5, $6)",
      [params.id, paypalorderid, params.email, params.payerid, params.amount, createddate]
    );
    await client.query(
      "update tbusersubscription set isactive = $2, usingstart = $3, usingend = $4, activetime = activetime + 1 where userid = $1",
      [userid, true, createddate, expireddate]
    );

    await client.query("update tbuserinfo set membership = true where id = $1", [userid]);

    return sendResponse(res, 200, "success", "success", "Create order successfully");
  }
  return sendResponse(res, 200, "success", "error", "Subcription not exist");
});

export const getAllOrders_ = errorHandler(async (req, res, next, client) => {
  const result = await client.query("SELECT * FROM tborderhistory");
  sendResponse(res, 200, "success", "success", result.rows);
});

export const getOrderPaymentDetail = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.getOrderPaymentDetail);
  let tableName = "";
  switch (params.paymentmethod) {
    case "PAYPAL":
      tableName = "tbpaypalpayment";
      break;
    case "MOMO":
      tableName = "tbmomopayment";
      break;
    default:
      return sendResponse(res, 200, "success", "error", "Payment method not exist");
  }
  const result = await client.query("SELECT * FROM " + tableName + " WHERE paymentid = $1", [params.paymentid]);
  return sendResponse(res, 200, "success", "success", result.rows);
});

export const testVnPay = errorHandler(async (req, res, next, client) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");

  let ipAddr =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

  let tmnCode = "09ZS3WH6";
  let secretKey = "IUOVDAELCAQFBSFLX1MKRAIOPY91ADO8";
  let vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  let returnUrl = "http://localhost:3000/IPN";
  // let orderId = moment(date).format("DDHHmmss");
  let orderId = "VNPAY_" + generateRandomString(20);

  let amount = req.body.amount;
  let locale = "vn";

  let currCode = "VND";
  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  vnp_Params = sortObject(vnp_Params);
  let signData = queryStringify(vnp_Params);
  let signed = getSignatureKey(signData, secretKey);
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + queryStringify(vnp_Params);

  sendResponse(res, 200, "success", "success", vnpUrl);
});
