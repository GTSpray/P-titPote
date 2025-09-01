import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [new winston.transports.Console()],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exception.log' }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'rejections.log' }),
    ],
});

