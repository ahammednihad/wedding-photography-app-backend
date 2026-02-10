const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    photographer: {
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
    }
  },
  { timestamps: true }
);

availabilitySchema.index({ photographer: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Availability", availabilitySchema);
