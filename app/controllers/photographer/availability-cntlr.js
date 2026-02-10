const User = require('../../models/user-model');
const Availability = require('../../models/availability-model');

const availabilityController = {
    async set(req, res) {
        try {
            const { date, isAvailable, timeSlots } = req.body;

            const availability = await Availability.findOneAndUpdate(
                { photographerId: req.userId, date },
                { photographerId: req.userId, date, isAvailable, timeSlots },
                { upsert: true, new: true }
            );

            res.json({ message: 'Availability updated successfully', availability });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = availabilityController;
