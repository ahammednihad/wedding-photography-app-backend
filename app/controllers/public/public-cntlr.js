const User = require('../../models/user-model');
const Booking = require('../../models/booking-model');
const Review = require('../../models/review-model');
const mailer = require('../../utils/mailer');

const publicController = {
    async listPhotographers(req, res) {
        try {
            const photographers = await User.find({
                role: 'photographer',
                isApproved: true,
                isActive: true
            }).select('-passwordHash');

            res.json(photographers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async viewPhotographer(req, res) {
        try {
            const photographer = await User.findOne({
                _id: req.params.id,
                role: 'photographer',
                isApproved: true,
                isActive: true
            }).select('-passwordHash');

            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }

            res.json(photographer);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async searchPhotographers(req, res) {
        try {
            const { location, priceRange, specialization, keyword } = req.body;
            const filter = {
                role: 'photographer',
                isApproved: true,
                isActive: true
            };

            if (location) {
                filter.$or = [
                    { name: new RegExp(location, 'i') },
                    { bio: new RegExp(location, 'i') }
                ];
            }

            if (specialization) {
                filter.skills = new RegExp(specialization, 'i');
            }

            if (priceRange) {
                const priceQuery = {};
                if (priceRange.min !== undefined) priceQuery.$gte = Number(priceRange.min);
                if (priceRange.max !== undefined) priceQuery.$lte = Number(priceRange.max);
                if (Object.keys(priceQuery).length > 0) {
                    filter.pricePerDay = priceQuery;
                }
            }

            if (keyword) {
                const keywordRegex = new RegExp(keyword, 'i');
                const keywordConditions = [
                    { name: keywordRegex },
                    { bio: keywordRegex },
                    { skills: keywordRegex },
                    { services: keywordRegex }
                ];
                if (filter.$or) {
                    filter.$and = [
                        { $or: filter.$or },
                        { $or: keywordConditions }
                    ];
                    delete filter.$or;
                } else {
                    filter.$or = keywordConditions;
                }
            }

            const photographers = await User.find(filter).select('-passwordHash');
            res.json(photographers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getAvailability(req, res) {
        try {
            const photographer = await User.findById(req.params.id).select('availability');
            if (!photographer) {
                return res.status(404).json({ error: 'Photographer not found' });
            }
            res.json(photographer.availability || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getBusySlots(req, res) {
        try {
            const bookings = await Booking.find({
                photographerId: req.params.id,
                status: { $in: ['confirmed', 'pending'] }
            }).select('eventDate startTime endTime');

            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getReviews(req, res) {
        try {
            const reviews = await Review.find({ photographerId: req.params.id })
                .populate('clientId', 'name')
                .sort({ createdAt: -1 });

            res.json(reviews);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async submitContactForm(req, res) {
        try {
            const { name, email, inquiryType, message } = req.body;
            if (!name || !email || !inquiryType || !message) {
                return res.status(400).json({ error: "All fields are required" });
            }

            // Trigger email to the admin
            await mailer.sendContactFormEmail({ name, email, inquiryType, message });
            res.json({ success: true, message: "Thank you for contacting us. Your message has been received." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = publicController;
