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
  getReqIpAddress,
  getInputVNPayDatetimeNow,
  convertVnPayDatetime,
  getDatetimeNow,
  getConvertedDatetime,
  getQueryOffset,
  getPageSize,
} from "../util/index.js";
import { orderSchema } from "../schema/index.js";

export const createPaypalOrder = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.createPaypalOrderParams);
  const userid = req.user.userid;
  const createddate = getStringDatetimeNow();
  const orderid = "OD" + generateRandomString(20);
  const paypalorderid = "PAYPAL_" + generateRandomString(20);
  const status = "PAID";
  const subcriptioninfo = await client.query("select * from tbsubcriptionplaninfo where subcriptionid = $1", [params.subcriptionid]);
  if (subcriptioninfo.rowCount == 1) {
    const duration = subcriptioninfo.rows[0].daysduration;

    const usersubcription = await client.query("select usingend from tbusersubscription where userid = $1", [userid]);

    const expiredate = getInputExtendDatetime(usersubcription.rows[0].usingend, duration, 0);

    await client.query(
      "insert into tborderhistory (orderid, userid, subcriptionid, paymentmethod, paymentid, createddate, status, amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [orderid, userid, params.subcriptionid, "PAYPAL", paypalorderid, createddate, status, subcriptioninfo.rows[0].amount]
    );
    await client.query(
      "insert into tbpaypalpayment (id,  paymentid,  email, payerid, amount, createddate) VALUES ($1, $2, $3, $4, $5, $6)",
      [params.id, paypalorderid, params.email, params.payerid, params.amount, createddate]
    );
    await client.query(
      "update tbusersubscription set isactive = $2, usingstart = $3, usingend = $4, subcriptionid = $5, activetime = activetime + 1 where userid = $1",
      [userid, true, createddate, expiredate, params.subcriptionid]
    );
    return sendResponse(res, 200, "success", "success", "Create order successfully");
  }
  return sendResponse(res, 200, "success", "error", "Subcription not exist");
});

export const getAllOrders_ = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query("SELECT * FROM tborderhistory LIMIT $1 OFFSET $2", [size, offset]);
  sendResponse(res, 200, "success", "success", result.rows);
});

export const getOrderPaymentDetail = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.getOrderPaymentDetail);
  let tableName = "";
  switch (params.paymentmethod) {
    case "PAYPAL":
      tableName = "tbpaypalpayment";
      break;
    case "VNPAY":
      tableName = "tbvnpaypayment";
      break;
    default:
      return sendResponse(res, 200, "success", "error", "Payment method not exist");
  }
  const result = await client.query("SELECT * FROM " + tableName + " WHERE paymentid = $1", [params.paymentid]);
  return sendResponse(res, 200, "success", "success", result.rows);
});

export const getOrderHistory = errorHandler(async (req, res, next, client) => {
  const offset = getQueryOffset(req.query.page);
  const size = getPageSize();
  const result = await client.query("SELECT * FROM tborderhistory WHERE userid = $1 LIMIT $2 OFFSET $3", [req.user.userid, size, offset]);
  return sendResponse(res, 200, "success", "success", result.rows);
});

export const createVNPayTransaction = errorHandlerTransaction(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, orderSchema.createVNPayTransactionParams);

  const subcriptioninfo = await client.query("select * from tbsubcriptionplaninfo where subcriptionid = $1", [params.subcriptionid]);
  if (subcriptioninfo.rowCount == 0) {
    return sendResponse(res, 200, "success", "error", "Subcription id not exist");
  }

  const checkpending = await client.query(`select * from tborderhistory where userid = $1 and subcriptionid = $2 and status = 'PENDING'`, [
    req.user.userid,
    params.subcriptionid,
  ]);

  if (checkpending.rowCount > 0) {
    const currentdatetime = getDatetimeNow();
    const createddatetime = getConvertedDatetime(checkpending.rows[0].createddate);
    // Check if there is a previous pending order which is not expired yet (hasn't passed 15 minutes)
    if (currentdatetime.isBefore(getInputExtendDatetime(createddatetime, 0, 0, 15))) {
      return sendResponse(res, 200, "success", "success", checkpending.rows[0].paymenturl);
    } else {
      await client.query("delete from tborderhistory where paymentid = $1", [checkpending.rows[0].paymentid]);
      await client.query("delete from tbvnpaypayment where paymentid = $1", [checkpending.rows[0].paymentid]);
    }
  }

  let date = new Date();
  let createDate = getInputVNPayDatetimeNow(date);
  let ipAddr = getReqIpAddress(req);

  let tmnCode = process.env.VNPAY_TERMINAL_CODE;
  let secretKey = process.env.VNPAY_SECREY_KEY;
  let vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  let returnUrl = process.env.FRONTEND_URL + "/vnpay/return";

  let orderId = "VNPAY_" + generateRandomString(20);
  let orderdescription =
    "Thanh toan cho ma GD: " + orderId + ", ma goi dich vu: " + params.subcriptionid + ", ma khach hang: " + req.user.userid + ",";
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
  vnp_Params["vnp_OrderInfo"] = orderdescription;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  // @ts-ignore
  vnp_Params = sortObject(vnp_Params);
  let signData = queryStringify(vnp_Params);
  let signed = getSignatureKey(signData, secretKey);
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + queryStringify(vnp_Params);

  const userid = req.user.userid;
  const createddate = getStringDatetimeNow();
  const orderid = "OD" + generateRandomString(20);
  const status = "PENDING";
  const transstatus = "01";

  await client.query(
    "insert into tborderhistory (orderid, userid, subcriptionid, paymentmethod, paymentid, createddate, status, paymenturl) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [orderid, userid, params.subcriptionid, "VNPAY", orderId, createddate, status, vnpUrl]
  );
  await client.query("insert into tbvnpaypayment (paymentid, description, transstatus, createddate) VALUES ($1, $2, $3, $4)", [
    orderId,
    orderdescription,
    transstatus,
    createddate,
  ]);

  sendResponse(res, 200, "success", "success", vnpUrl);
});

export const hanldeVNPayIPN = errorHandlerTransaction(async (req, res, next, client) => {
  let vnp_Params = req.query;
  let secureHash = vnp_Params["vnp_SecureHash"];
  let orderId = vnp_Params["vnp_TxnRef"];
  let rspCode = vnp_Params["vnp_ResponseCode"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);
  let cardType = vnp_Params["vnp_CardType"];
  let bankCode = vnp_Params["vnp_BankCode"];
  let description = vnp_Params["vnp_OrderInfo"];
  let transstatus = vnp_Params["vnp_TransactionStatus"];
  let secretKey = process.env.VNPAY_SECREY_KEY;
  let signData = queryStringify(vnp_Params);
  let signed = getSignatureKey(signData, secretKey);
  let banktranno = vnp_Params["vnp_BankTranNo"];
  let amount = Number(vnp_Params["vnp_Amount"]) / 100;
  const paymentdate = convertVnPayDatetime(vnp_Params["vnp_PayDate"]);

  let paymentStatus = "0"; // Giả sử '0' là trạng thái khởi tạo giao dịch, chưa có IPN. Trạng thái này được lưu khi yêu cầu thanh toán chuyển hướng sang Cổng thanh toán VNPAY tại đầu khởi tạo đơn hàng.
  //let paymentStatus = '1'; // Giả sử '1' là trạng thái thành công bạn cập nhật sau IPN được gọi và trả kết quả về nó
  //let paymentStatus = '2'; // Giả sử '2' là trạng thái thất bại bạn cập nhật sau IPN được gọi và trả kết quả về nó

  const vnpayordercheck = await client.query(
    `select t2.paymentid, t2.amount from tborderhistory t1 
    join tbvnpaypayment t2 on t1.paymentid = t2.paymentid 
    where t2.paymentid = $1`,
    [orderId]
  );

  let checkOrderId = vnpayordercheck.rows[0].paymentid == orderId ? true : false;
  let checkAmount = Number(vnpayordercheck.rows[0].amount) == amount ? true : false;
  if (secureHash === signed) {
    //kiểm tra checksum
    if (checkOrderId) {
      if (checkAmount) {
        if (paymentStatus == "0") {
          //kiểm tra tình trạng giao dịch trước khi cập nhật tình trạng thanh toán
          if (rspCode == "00") {
            //thanh cong
            const regex = /:\s*([^,]+)/g;
            const matches = [];

            // orderid | subcriptionid | userid
            let splitData;

            while ((splitData = regex.exec(description)) !== null) {
              matches.push(splitData[1].trim());
            }

            const subcriptioninfo = await client.query("select * from tbsubcriptionplaninfo where subcriptionid = $1", [splitData[1]]);
            if (subcriptioninfo.rowCount == 1) {
              const duration = subcriptioninfo.rows[0].daysduration;

              const usersubcription = await client.query("select usingend from tbusersubscription where userid = $1", [splitData[2]]);

              const expiredate = getInputExtendDatetime(usersubcription.rows[0].usingend, duration, 0);

              await client.query(
                "update tbusersubscription set isactive = $2, usingstart = $3, usingend = $4, subcriptionid = $5, activetime = activetime + 1 where userid = $1",
                [splitData[2], true, getStringDatetimeNow(), expiredate, splitData[1]]
              );

              const paymentstatus = "PAID";
              await client.query("UPDATE tborderhistory SET status = $2, paymentdate = $3, amount = $4 WHERE paymentid = $1", [
                orderId,
                paymentstatus,
                paymentdate,
                amount,
              ]);

              await client.query(
                "UPDATE tbvnpaypayment SET id = $2, cardtype = $3, bankcode = $4, transstatus = $5, amount = $6 WHERE paymentid = $1",
                [orderId, banktranno, cardType, bankCode, transstatus, amount]
              );

              res.status(200).json({ RspCode: "00", Message: "Success" });
            } else res.status(200).json({ RspCode: "02", Message: "Subcription id not exist" });
          } else {
            res.status(200).json({ RspCode: "00", Message: "Success" });
          }
        } else {
          res.status(200).json({ RspCode: "02", Message: "This order has been updated to the payment status" });
        }
      } else {
        res.status(200).json({ RspCode: "04", Message: "Amount invalid" });
      }
    } else {
      res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }
  } else {
    res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
  }
});
