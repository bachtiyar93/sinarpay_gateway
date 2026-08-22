import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ENCRYPTION_KEY: Joi.string()
    .length(64)
    .required()
    .description('32-byte hex string (64 characters)'),
  BANK_CALLBACK_SECRET: Joi.string().required(),
  WEBHOOK_MAX_RETRIES: Joi.number().default(5),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
});
