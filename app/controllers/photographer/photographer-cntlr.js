const mongoose = require('mongoose');
const Booking = require('../../models/booking-model');
const User = require('../../models/user-model');
const Payment = require('../../models/payment-model');

const photographerController = {
    async getDashboardStats(req, res) {
        try {
            const totalAssignments = await Booking.countDocuments({ photographerId: req.userId });
            const pendingAssignments = await Booking.countDocuments({ photographerId: req.userId, status: 'pending' });
            const completedAssignments = await Booking.countDocuments({ photographerId: req.userId, status: 'completed' });

            const totalEarnings = await Payment.aggregate([
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'booking',
                        foreignField: '_id',
                        as: 'bookingDetails'
                    }
                },
                { $unwind: '$bookingDetails' },
                {
                    $match: {
                        'bookingDetails.photographerId': new mongoose.Types.ObjectId(req.userId),
                        status: 'success'
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            res.json({
                totalAssignments,
                pendingAssignments,
                completedAssignments,
                totalEarnings: totalEarnings[0]?.total || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async listAssignments(req, res) {
        try {
            const { status, limit } = req.query;
            const query = { photographerId: req.userId };
            if (status) query.status = status;

            let dbQuery = Booking.find(query)
                .populate('clientId', 'name email phone')
                .sort({ eventDate: 1 });

            if (limit) dbQuery = dbQuery.limit(parseInt(limit));

            const assignments = await dbQuery;
            res.json(assignments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async acceptAssignment(req, res) {
        try {
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, photographerId: req.userId },
                { status: 'confirmed' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.json({ message: 'Assignment accepted', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async declineAssignment(req, res) {
        try {
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, photographerId: req.userId },
                { status: 'cancelled', photographerId: null },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.json({ message: 'Assignment declined', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getSchedule(req, res) {
        try {
            const bookings = await Booking.find({
                photographerId: req.userId,
                status: { $in: ['confirmed', 'pending'] }
            })
                .populate('clientId', 'name email phone')
                .sort({ eventDate: 1 });

            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getCompletedEvents(req, res) {
        try {
            const completedBookings = await Booking.find({
                photographerId: req.userId,
                status: 'completed'
            })
                .populate('clientId', 'name email')
                .sort({ eventDate: -1 });

            res.json(completedBookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async markEventCompleted(req, res) {
        try {
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, photographerId: req.userId },
                { status: 'completed' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Event marked as completed', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getEarnings(req, res) {
        try {
            // Aggregate monthly earnings
            const monthlyEarningsResult = await Payment.aggregate([
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'booking',
                        foreignField: '_id',
                        as: 'bookingDetails'
                    }
                },
                { $unwind: '$bookingDetails' },
                {
                    $match: {
                        'bookingDetails.photographerId': new mongoose.Types.ObjectId(req.userId),
                        status: 'success'
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Calculate totals for various timeframes
            const totalEarningsResult = await Payment.aggregate([
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'booking',
                        foreignField: '_id',
                        as: 'bookingDetails'
                    }
                },
                { $unwind: '$bookingDetails' },
                {
                    $match: {
                        'bookingDetails.photographerId': new mongoose.Types.ObjectId(req.userId),
                        status: 'success'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Detailed transactions list
            const transactions = await Payment.find({ status: 'success' })
                .populate({
                    path: 'booking',
                    match: { photographerId: req.userId },
                    select: 'eventType package eventDate location amount'
                })
                .populate('user', 'name email mobile')
                .sort({ createdAt: -1 });

            // Filter out transactions that don't belong to this photographer
            const filteredTransactions = transactions.filter(t => t.booking);

            res.json({
                totalEarnings: totalEarningsResult[0]?.total || 0,
                totalJobs: totalEarningsResult[0]?.count || 0,
                monthlyEarnings: monthlyEarningsResult,
                transactions: filteredTransactions.map(t => ({
                    _id: t._id,
                    amount: t.amount,
                    paymentDate: t.createdAt,
                    eventType: t.booking.eventType,
                    package: t.booking.package,
                    clientName: t.user?.name || 'Guest Client',
                    eventDate: t.booking.eventDate
                }))
            });
        } catch (error) {
            console.error("Earnings Error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    async listBookings(req, res) {
        try {
            const bookings = await Booking.find({ photographerId: req.userId })
                .populate('clientId', 'name email phone')
                .sort({ createdAt: -1 });

            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getBookingById(req, res) {
        try {
            const booking = await Booking.findOne({
                _id: req.params.id,
                photographerId: req.userId
            }).populate('clientId', 'name email phone');

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json(booking);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateBookingStatus(req, res) {
        try {
            const { status } = req.body;
            const booking = await Booking.findOneAndUpdate(
                { _id: req.params.id, photographerId: req.userId },
                { status },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Booking status updated', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getProfile(req, res) {
        try {
            const photographer = await User.findById(req.userId).select('-passwordHash');
            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }
            res.json(photographer);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateProfile(req, res) {
        try {
            const photographer = await User.findByIdAndUpdate(
                req.userId,
                req.body,
                { new: true, runValidators: true }
            ).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Profile updated successfully', photographer });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = photographerController;
