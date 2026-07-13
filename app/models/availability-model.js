const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    photographerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    timeSlots: {
      type: [String], // e.g. ["09:00-12:00", "14:00-18:00"]
      default: []
    }
  },
  { timestamps: true }
);

// Compound unique index — one record per photographer per date
availabilitySchema.index({ photographerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Availability", availabilitySchema);
