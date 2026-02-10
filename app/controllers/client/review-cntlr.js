const Review = require("../../models/review-model");
const Booking = require("../../models/booking-model");

const reviewController = {};

reviewController.create = async (req, res) => {
    try {
        const { bookingId, rating, comment } = req.body;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        if (booking.clientId.toString() !== req.userId) {
            return res.status(403).json({ error: "You can only review your own bookings" });
        }

        // Ideally only completed bookings can be reviewed
        if (booking.status !== "completed") {
            return res.status(400).json({ error: "You can only review completed bookings" });
        }

        const review = new Review({
            booking: booking._id,
            photographerId: booking.photographerId,
            clientId: req.userId,
            rating,
            comment
        });

        await review.save();
        res.status(201).json(review);
    } catch (err) {
        console.error("Review creation error:", err);
        res.status(500).json({ error: err.message || "Something went wrong" });
    }
};

module.exports = reviewController;
