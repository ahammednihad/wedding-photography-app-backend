const Booking = require('../../models/booking-model');
const Payment = require('../../models/payment-model');
const User = require('../../models/user-model');
const mongoose = require('mongoose');

const { createBookingValidationSchema } = require('../../validations/booking-validation');

const clientController = {
    // ==================== DASHBOARD ====================
    async getDashboardStats(req, res) {
        try {
            const clientId = req.user._id;

            const totalBookings = await Booking.countDocuments({ clientId });
            const upcomingBookings = await Booking.countDocuments({
                clientId,
                eventDate: { $gte: new Date() },
                status: { $in: ['pending', 'confirmed'] }
            });
            const completedBookings = await Booking.countDocuments({
                clientId,
                status: 'completed'
            });

            const totalSpent = await Payment.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(clientId), status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            res.json({
                totalBookings,
                upcomingBookings,
                completedBookings,
                totalSpent: totalSpent[0]?.total || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async listVerifiedPhotographers(req, res) {
        try {
            // Find users who are photographers AND are verified (approved by admin)
            const photographers = await User.find({ role: 'photographer', isApproved: true })
                .select('-passwordHash -__v'); // Exclude sensitive info

            res.json(photographers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== BOOKINGS ====================
    async createBooking(req, res) {
        try {
            // Joi Validation
            const { error, value } = createBookingValidationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            const { photographerId, eventDate, startTime, endTime } = value;

            // 1. Double Booking Check (Conflict Validation)
            // Use the static method we added to the model
            const isOverlapping = await Booking.checkOverlap(photographerId, eventDate, startTime, endTime);

            if (isOverlapping) {
                return res.status(400).json({
                    error: "Scheduling Conflict",
                    message: "The photographer is already booked for this time slot. Please choose another time or date."
                });
            }

            const bookingData = {
                ...value,
                clientId: req.user._id,
                status: 'pending'
            };

            const booking = new Booking(bookingData);
            await booking.save();

            res.status(201).json({
                message: 'Booking request sent. Please wait for photographer approval.',
                booking
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async myBookings(req, res) {
        try {
            const { status, limit } = req.query;
            const filter = { clientId: req.user._id };

            if (status) filter.status = status;

            let query = Booking.find(filter)
                .populate('photographerId', 'name email phone portfolio')
                .sort({ createdAt: -1 });

            if (limit) query = query.limit(parseInt(limit));

            const bookings = await query;

            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getBooking(req, res) {
        try {
            const booking = await Booking.findOne({
                _id: req.params.id,
                clientId: req.user._id
            }).populate('photographerId', 'name email phone portfolio');

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json(booking);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateBooking(req, res) {
        try {
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, clientId: req.user._id, status: 'pending' },
                req.body,
                { new: true, runValidators: true }
            );

            if (!booking) {
                return res.status(404).json({
                    error: 'Booking not found or cannot be updated'
                });
            }

            res.json({ message: 'Booking updated successfully', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async cancelBooking(req, res) {
        try {
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, clientId: req.user._id },
                { status: 'cancelled' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Booking cancelled successfully', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== PAYMENTS ====================
    async recordPayment(req, res) {
        try {
            const booking = await Booking.findOne({
                _id: req.params.id,
                clientId: req.user._id
            });

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            const payment = new Payment({
                booking: booking._id,
                user: req.user._id,
                amount: req.body.amount,
                status: 'success'
            });

            await payment.save();

            // Update booking payment status
            booking.paymentStatus = 'paid';
            await booking.save();

            res.json({
                message: 'Payment recorded successfully',
                payment
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPaymentHistory(req, res) {
        try {
            const payments = await Payment.find({ user: req.user._id })
                .populate('booking', 'eventType eventDate package')
                .sort({ createdAt: -1 });

            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPaymentById(req, res) {
        try {
            const payment = await Payment.findOne({
                _id: req.params.id,
                user: req.user._id
            }).populate('booking');

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            res.json(payment);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== PROFILE ====================
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user._id).select('-passwordHash');
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateProfile(req, res) {
        try {
            const allowedUpdates = ['name', 'email', 'phone', 'address'];
            const updates = {};

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            const user = await User.findByIdAndUpdate(
                req.user._id,
                updates,
                { new: true, runValidators: true }
            ).select('-passwordHash');

            res.json({ message: 'Profile updated successfully', user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== FAVORITES / BOOKMARKS ====================
    async addFavorite(req, res) {
        try {
            const { photographerId, imageUrl, category } = req.body;
            const user = await User.findById(req.user._id);

            // Check if already favorited
            const exists = user.favorites.some(f => f.imageUrl === imageUrl);
            if (exists) {
                return res.status(400).json({ error: 'Already bookmarked' });
            }

            user.favorites.push({ photographerId, imageUrl, category });
            await user.save();

            res.json({ message: 'Added to bookmarks', favorites: user.favorites });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async removeFavorite(req, res) {
        try {
            const { favoriteId } = req.params;
            const user = await User.findById(req.user._id);

            user.favorites = user.favorites.filter(f => f._id.toString() !== favoriteId);
            await user.save();

            res.json({ message: 'Removed from bookmarks', favorites: user.favorites });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getFavorites(req, res) {
        try {
            const user = await User.findById(req.user._id).populate('favorites.photographerId', 'name');
            res.json(user.favorites);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = clientController;
