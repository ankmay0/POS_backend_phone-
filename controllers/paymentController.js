import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const generateChecksum = (payload, endpoint) => {
  const stringToHash = payload + endpoint + process.env.PHONEPE_SALT_KEY;
  const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
  return `${sha256}###${process.env.PHONEPE_SALT_INDEX}`;
};

export const initiatePayment = async (req, res) => {
  try {
    const { amount, orderId, userId } = req.body;

    const merchantTransactionId = orderId || uuidv4();
    const payload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      amount: amount * 100,
      redirectUrl: `https://foodfantasy-live.vercel.app/payment-success?orderId=${merchantTransactionId}`,
      redirectMode: "REDIRECT",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const checksum = generateChecksum(base64Payload, "/pg/v1/pay");

    const response = await axios.post(
      process.env.PHONEPE_BASE_URL,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );

    res.json({
      success: true,
      redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
      merchantTransactionId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkStatus = async (req, res) => {
  try {
    const endpoint = `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${req.params.transactionId}`;
    const checksum = generateChecksum("", endpoint);

    const response = await axios.get(`${process.env.PHONEPE_STATUS_URL}/${process.env.PHONEPE_MERCHANT_ID}/${req.params.transactionId}`, {
      headers: {
        "X-VERIFY": checksum,
      },
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
