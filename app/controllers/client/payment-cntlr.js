const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../../models/booking-model");
const Payment = require("../../models/payment-model");
const User = require("../../models/user-model");
const paymentValidationSchema = require("../../validations/payment-validation");
const mailer = require("../../utils/mailer");

const paymentController = {};

// ================= CREATE ORDER =================
paymentController.createOrder = async (req, res) => {
    try {
        //  Validate request
        const { error, value } = paymentValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details });
        }

        //  Ensure env keys exist (prevents crash)
        if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {
            return res.status(500).json({
                error: "Razorpay keys are missing. Check .env file"
            });
        }

        //  Create Razorpay instance HERE (safe)
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const booking = await Booking.findById(value.booking);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        if (booking.status !== "pending" && booking.status !== "confirmed") {
            return res.status(400).json({
                error: "Payment not allowed for this booking status."
            });
        }

        // Check if a successful payment already exists
        const existingPayment = await Payment.findOne({ booking: booking._id, status: "success" });
        if (existingPayment) {
            return res.status(400).json({
                error: "Payment already completed for this booking."
            });
        }

        //  Create order
        const order = await razorpay.orders.create({
            amount: value.amount * 100,
            currency: "INR",
            receipt: `booking_${booking._id}`
        });

        // Save payment
        const payment = new Payment({
            booking: booking._id,
            user: req.userId,
            amount: value.amount,
            razorpayOrderId: order.id,
            status: "created"
        });

        await payment.save();

        res.json({
            orderId: order.id,
            key: process.env.RAZORPAY_KEY_ID,
            amount: order.amount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create payment order" });
    }
};

// ================= VERIFY PAYMENT =================
paymentController.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            // Mark payment as failed in DB and send failure email alert
            const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
            if (payment) {
                payment.status = "failed";
                await payment.save();
                const client = await User.findById(payment.user);
                const booking = await Booking.findById(payment.booking);
                if (client && booking) {
                    mailer.sendPaymentFailureEmail(client, booking, "Payment verification failed - Signature mismatch");
                }
            }
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        const payment = await Payment.findOne({
            razorpayOrderId: razorpay_order_id
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        // Update payment
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.status = "success";
        await payment.save();

        // Confirm booking & Update payment status
        const booking = await Booking.findByIdAndUpdate(payment.booking, {
            status: "confirmed",
            paymentStatus: "paid"
        }, { new: true });

        const client = await User.findById(payment.user);
        const photographer = await User.findById(booking?.photographerId);

        if (client && booking) {
            // Trigger emails asynchronously
            mailer.sendPaymentSuccessEmail(payment, client, booking);
            mailer.sendBookingStatusEmail(booking, client, photographer, "confirmed");
        }

        res.json({
            success: true,
            message: "Payment verified & booking confirmed"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ================= PAYMENT HISTORY =================
paymentController.history = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.userId })
            .populate("booking");

        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
};

module.exports = paymentController;
