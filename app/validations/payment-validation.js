const Joi = require('joi');

const paymentValidationSchema = Joi.object({
    booking: Joi.string().hex().length(24).required().messages({
        'string.length': 'Invalid Booking ID'
    }),
    amount: Joi.number().min(1).required().messages({
        'number.min': 'Amount must be at least 1'
    })
});

module.exports = paymentValidationSchema;
