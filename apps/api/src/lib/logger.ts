import winston from 'winston';

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'rastera-api' },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
    // In production: add CloudWatch / Datadog transports here
  ],
});
