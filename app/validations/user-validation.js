const Joi = require("joi");

const photographerRegisterValidationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("photographer").required(),
  phone: Joi.string().required(),
  pricePerDay: Joi.number().required(),
  isApproved: Joi.boolean()
});


const clientRegisterValidationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("client").required(),
  phone: Joi.string().optional()
});

// Frontend auth register: name, email, password, role only
const authRegisterValidationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("client", "photographer", "admin").required()
});


const userLoginValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updatePhotographerProfileSchema = Joi.object({
  name: Joi.string().optional(),
  bio: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  services: Joi.array().items(Joi.string()).optional()
});

module.exports = {
  photographerRegisterValidationSchema,
  clientRegisterValidationSchema,
  authRegisterValidationSchema,
  userLoginValidationSchema,
  updatePhotographerProfileSchema
};
