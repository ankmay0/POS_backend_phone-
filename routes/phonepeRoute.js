import express from "express";
import { initiatePayment, checkStatus } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/initiate", initiatePayment);
router.get("/status/:transactionId", checkStatus);

export default router;
