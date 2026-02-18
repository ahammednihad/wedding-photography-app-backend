const Joi = require("joi");

// Full booking validation
const createBookingValidationSchema = Joi.object({
    photographerId: Joi.string().hex().length(24).required().messages({
        "string.length": "Invalid Photographer ID",
    }),
    eventDate: Joi.date().min("now").required().messages({
        "date.min": "Event date cannot be in the past",
    }),
    startTime: Joi.string()
        .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .required()
        .messages({
            "string.pattern.base": "Start time must be in HH:mm format",
        }),
    endTime: Joi.string()
        .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .required()
        .messages({
            "string.pattern.base": "End time must be in HH:mm format",
        }),
    eventType: Joi.string()
        .valid("Wedding", "Engagement", "Pre-Wedding", "Reception", "Other")
        .required(),
    location: Joi.string().required(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    package: Joi.string().valid("silver", "gold", "platinum").optional(),
    notes: Joi.string().allow("").optional(),
});

// Update status validation
const updateBookingStatusSchema = Joi.object({
    status: Joi.string()
        .valid("pending", "confirmed", "declined", "in_progress", "completed", "cancelled")
        .required(),
});

const assignPhotographerSchema = Joi.object({
    photographerId: Joi.string().hex().length(24).required(),
});

module.exports = {
    createBookingValidationSchema,
    updateBookingStatusSchema,
    assignPhotographerSchema,
};
