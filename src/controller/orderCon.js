import {
  generateRandomString,
  sendResponse,
  getStringDatetimeNow,
  getExtendDatetime,
  errorHandlerTransaction,
  errorHandler,
  preProcessingBodyParam,
  getInputExtendDatetime,
} from "../util/index.js";
import { sendEmail } from "../services/mailer.js";
import { orderSchema } from "../schema/index.js";

export const createPaypalOrder = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.createPaypalOrderParams);
  const userid = req.user.userid;
  const createddate = getStringDatetimeNow();
  const orderid = "OD" + generateRandomString(20);
  const paypalorderid = "PAYPAL" + generateRandomString(20);
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
