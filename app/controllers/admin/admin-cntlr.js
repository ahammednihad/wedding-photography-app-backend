const Booking = require('../../models/booking-model');
const User = require('../../models/user-model');
const Payment = require('../../models/payment-model');
const mongoose = require('mongoose');

const adminController = {
    // ==================== DASHBOARD ====================
    async getDashboardStats(req, res) {
        try {
            const totalUsers = await User.countDocuments();
            const totalClients = await User.countDocuments({ role: 'client' });
            const totalPhotographers = await User.countDocuments({ role: 'photographer' });
            const pendingPhotographers = await User.countDocuments({ role: 'photographer', isApproved: false });

            const totalBookings = await Booking.countDocuments();
            const pendingBookings = await Booking.countDocuments({ status: 'pending' });
            const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
            const completedBookings = await Booking.countDocuments({ status: 'completed' });

            const totalRevenue = await Payment.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const recentBookings = await Booking.find()
                .populate('clientId', 'name email')
                .populate('photographerId', 'name email')
                .sort({ createdAt: -1 })
                .limit(5);

            res.json({
                users: {
                    total: totalUsers,
                    clients: totalClients,
                    photographers: totalPhotographers,
                    pendingPhotographers
                },
                bookings: {
                    total: totalBookings,
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings
                },
                revenue: {
                    total: totalRevenue[0]?.total || 0
                },
                recentBookings
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== USERS MANAGEMENT ====================
    async listAllUsers(req, res) {
        try {
            const { role, status } = req.query;
            const filter = {};

            if (role) filter.role = role;
            if (status === 'active') filter.isActive = true;
            if (status === 'blocked') filter.isActive = false;

            const users = await User.find(filter)
                .select('-passwordHash')
                .sort({ createdAt: -1 });

            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getProfile(req, res) {
        try {
            const user = await User.findById(req.userId).select('-passwordHash');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getUserById(req, res) {
        try {
            const user = await User.findById(req.params.id).select('-passwordHash');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateUser(req, res) {
        try {
            const user = await User.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            ).select('-passwordHash');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ message: 'User updated successfully', user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async blockUser(req, res) {
        try {
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { isActive: false },
                { new: true }
            ).select('-passwordHash');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ message: 'User blocked successfully', user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async unblockUser(req, res) {
        try {
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { isActive: true },
                { new: true }
            ).select('-passwordHash');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ message: 'User unblocked successfully', user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteUser(req, res) {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== BOOKINGS MANAGEMENT ====================
    async listAllBookings(req, res) {
        try {
            const { status, startDate, endDate } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (startDate && endDate) {
                filter.eventDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const bookings = await Booking.find(filter)
                .populate('clientId', 'name email phone')
                .populate('photographerId', 'name email phone')
                .sort({ createdAt: -1 });

            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getBookingById(req, res) {
        try {
            const booking = await Booking.findById(req.params.id)
                .populate('clientId', 'name email phone')
                .populate('photographerId', 'name email phone');

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
            const booking = await Booking.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            ).populate('clientId photographerId');

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Booking status updated', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteBooking(req, res) {
        try {
            const booking = await Booking.findByIdAndDelete(req.params.id);
            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Booking deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== PHOTOGRAPHER MANAGEMENT ====================
    async listPhotographers(req, res) {
        try {
            const { status } = req.query;
            const filter = { role: 'photographer' };

            if (status === 'pending') filter.isApproved = false;
            if (status === 'approved') filter.isApproved = true;
            if (status === 'blocked') filter.isActive = false;

            const photographers = await User.find(filter)
                .select('-passwordHash')
                .sort({ createdAt: -1 });

            res.json(photographers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async pendingPhotographers(req, res) {
        try {
            const photographers = await User.find({
                role: 'photographer',
                isApproved: false
            }).select('-passwordHash');

            res.json(photographers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async approvePhotographer(req, res) {
        try {
            const photographer = await User.findByIdAndUpdate(
                req.params.id,
                { isApproved: true, isActive: true },
                { new: true }
            ).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Photographer approved successfully', photographer });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async rejectPhotographer(req, res) {
        try {
            const photographer = await User.findByIdAndUpdate(
                req.params.id,
                { isApproved: false, isActive: false },
                { new: true }
            ).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Photographer rejected', photographer });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async blockPhotographer(req, res) {
        try {
            const photographer = await User.findByIdAndUpdate(
                req.params.id,
                { isActive: false },
                { new: true }
            ).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Photographer blocked successfully', photographer });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async unblockPhotographer(req, res) {
        try {
            const photographer = await User.findByIdAndUpdate(
                req.params.id,
                { isActive: true },
                { new: true }
            ).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Photographer unblocked successfully', photographer });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deletePhotographer(req, res) {
        try {
            const photographer = await User.findOneAndDelete({
                _id: req.params.id,
                role: 'photographer'
            });

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json({ message: 'Photographer deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== ASSIGNMENTS ====================
    async assignPhotographer(req, res) {
        try {
            const { photographerId } = req.body;
            const booking = await Booking.findByIdAndUpdate(
                req.params.id,
                { photographerId, status: 'pending' },
                { new: true }
            ).populate('clientId photographerId');

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Photographer assigned successfully', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async reassignPhotographer(req, res) {
        try {
            const { photographerId } = req.body;
            const booking = await Booking.findByIdAndUpdate(
                req.params.id,
                { photographerId },
                { new: true }
            ).populate('clientId photographerId');

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.json({ message: 'Photographer reassigned successfully', booking });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== PAYMENTS ====================
    async listAllPayments(req, res) {
        try {
            const { status, startDate, endDate } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (startDate && endDate) {
                filter.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const payments = await Payment.find(filter)
                .populate('booking')
                .populate('user', 'name email')
                .sort({ createdAt: -1 });

            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPaymentStats(req, res) {
        try {
            const totalRevenue = await Payment.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const pendingPayments = await Payment.aggregate([
                { $match: { status: 'created' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const monthlyRevenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'success',
                        createdAt: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            res.json({
                totalRevenue: totalRevenue[0]?.total || 0,
                pendingPayments: pendingPayments[0]?.total || 0,
                monthlyRevenue: monthlyRevenue[0]?.total || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== CONFLICT RESOLUTION ====================
    async getBookingConflicts(req, res) {
        try {
            // Find bookings where photographer is assigned and status is pending or confirmed
            const bookings = await Booking.find({
                photographerId: { $ne: null },
                status: { $in: ['pending', 'confirmed'] }
            })
                .populate('clientId', 'name')
                .populate('photographerId', 'name')
                .sort({ eventDate: 1, startTime: 1 });

            const conflicts = [];

            for (let i = 0; i < bookings.length; i++) {
                for (let j = i + 1; j < bookings.length; j++) {
                    const b1 = bookings[i];
                    const b2 = bookings[j];

                    // Same photographer, same day
                    if (
                        b1.photographerId?._id.toString() === b2.photographerId?._id.toString() &&
                        new Date(b1.eventDate).toDateString() === new Date(b2.eventDate).toDateString()
                    ) {
                        // Check for time overlap
                        // For simplicity, we assume events on the same day for the same photographer are potential conflicts
                        // as wedding shoots usually take the whole day.
                        conflicts.push({
                            photographer: b1.photographerId.name,
                            date: b1.eventDate,
                            bookingA: {
                                id: b1._id,
                                client: b1.clientId?.name,
                                type: b1.eventType,
                                time: `${b1.startTime} - ${b1.endTime}`
                            },
                            bookingB: {
                                id: b2._id,
                                client: b2.clientId?.name,
                                type: b2.eventType,
                                time: `${b2.startTime} - ${b2.endTime}`
                            }
                        });
                    }
                }
            }

            res.json(conflicts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==================== ACTIVITY LOGS ====================
    async getActivityLogs(req, res) {
        try {
            const recentBookings = await Booking.find()
                .populate('clientId', 'name')
                .populate('photographerId', 'name')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const recentUsers = await User.find()
                .select('name role createdAt')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const activities = [
                ...recentBookings.map(b => ({
                    type: 'booking',
                    title: 'New Booking Created',
                    description: `${b.clientId?.name} created a booking for ${b.eventType}`,
                    timestamp: b.createdAt,
                    details: {
                        'Event Type': b.eventType,
                        'Event Date': b.eventDate,
                        'Status': b.status
                    }
                })),
                ...recentUsers.map(u => ({
                    type: 'user',
                    title: 'New User Registration',
                    description: `${u.name} registered as ${u.role}`,
                    timestamp: u.createdAt,
                    userName: u.name
                }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            res.json(activities);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController;
