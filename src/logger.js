import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, json, errors } = winston.format;
const { Console, DailyRotateFile } = winston.transports;

const level = process.env.LOG_LEVEL || 'http';
const v = process.env.npm_package_version;
const dailyOpts = {
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d'
}
export const logger = winston.createLogger({
    level,
    format: combine(
        errors({ stack: true }),
        timestamp(),
        winston.format((info) => {
            const {
                timestamp: ts, level: lvl, message: msg, ...rest
            } = info;

            return {
                ts, lvl, v, msg, ...rest,
            };
        })(),
        json({ deterministic: false })
    ),
    transports: [
        new Console({ level }),
        new DailyRotateFile({
            level,
            filename: 'logs/ptitpote-combined-%DATE%.log',
            ...dailyOpts
        })
    ],
    exceptionHandlers: [
        new DailyRotateFile({
            filename: 'logs/ptitpote-exceptions-%DATE%.log',
            ...dailyOpts
        })
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: 'logs/ptitpote-rejections-%DATE%.log',
            ...dailyOpts
        })
    ],
});

