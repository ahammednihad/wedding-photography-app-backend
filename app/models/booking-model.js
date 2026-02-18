const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        photographerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },
        eventDate: {
            type: Date,
            required: true
        },
        startTime: {
            type: String, // HH:mm format
            required: true
        },
        endTime: {
            type: String, // HH:mm format
            required: true
        },
        eventType: {
            type: String,
            default: "wedding"
        },
        eventVenue: {
            type: String
        },
        location: {
            type: String
        },
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        },
        package: {
            type: String,
            default: "gold"
        },
        amount: {
            type: Number,
            required: false
        },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid"],
            default: "unpaid"
        },
        notes: {
            type: String
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "declined", "in_progress", "completed", "cancelled"],
            default: "pending"
        }
    },
    { timestamps: true }
);

// Indexes for performance
bookingSchema.index({ clientId: 1 });
bookingSchema.index({ photographerId: 1 });
bookingSchema.index({ eventDate: 1 });
bookingSchema.index({ photographerId: 1, eventDate: 1 }); // Compound for overlap check speed

// Statics for overlap check
bookingSchema.statics.checkOverlap = async function (photographerId, date, startTime, endTime, excludeBookingId = null) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const query = {
        photographerId,
        eventDate: {
            $gte: targetDate,
            $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { $in: ["pending", "confirmed", "in_progress", "completed"] },
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const bookings = await this.find(query);

    for (const b of bookings) {
        // Overlap logic: (StartA < EndB) and (EndA > StartB)
        if (startTime < b.endTime && endTime > b.startTime) {
            return true; // Conflict found
        }
    }
    return false;
};

// Pre-save hook for last-resort validation
bookingSchema.pre('save', async function () {
    if (this.isModified('eventDate') || this.isModified('startTime') || this.isModified('endTime')) {
        const hasOverlap = await mongoose.model('Booking').checkOverlap(
            this.photographerId,
            this.eventDate,
            this.startTime,
            this.endTime,
            this._id
        );
        if (hasOverlap) {
            throw new Error('Photographer is already booked for this time slot.');
        }
    }
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
