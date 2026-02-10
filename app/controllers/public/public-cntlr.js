const User = require('../../models/user-model');
const Booking = require('../../models/booking-model');
const Review = require('../../models/review-model');

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
            const { location, priceRange, specialization } = req.body;
            const filter = {
                role: 'photographer',
                isApproved: true,
                isActive: true
            };

            if (location) filter['profile.location'] = new RegExp(location, 'i');
            if (specialization) filter['profile.specialization'] = specialization;
            if (priceRange) {
                filter['profile.pricing.min'] = { $lte: priceRange.max };
                filter['profile.pricing.max'] = { $gte: priceRange.min };
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
    }
};

module.exports = publicController;
