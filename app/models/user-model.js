const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: false
    },

    bio: {
      type: String,
      maxlength: 500
    },

    skills: {
      type: [String], // e.g. ["Candid", "Traditional", "Drone"]
      default: undefined
    },

    experience: {
      type: Number, // years of experience
      min: 0
    },

    pricePerDay: {
      type: Number,
      default: 0
    },


    services: {
      type: [String], // e.g. ["Wedding", "Pre-wedding", "Reception"]
      default: undefined
    },

    portfolio: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],

    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking"
      }
    ],

    role: {
      type: String,
      enum: ["photographer", "client", "admin"],
      required: true
    },

    isApproved: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    avatar: {
      type: String // profile image URL
    },
    favorites: [
      {
        photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        imageUrl: String,
        category: String,
        savedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
