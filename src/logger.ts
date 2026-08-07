import 'dotenv/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { v4 } from 'uuid';
const { combine, timestamp, json, errors } = winston.format;
const { Console, DailyRotateFile } = winston.transports;

const level = process.env.LOG_LEVEL || 'http';
const v = process.env.npm_package_version;
const dailyOpts = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
};

function onTransportError(transportName: string) {
  return (err: NodeJS.ErrnoException) => {
    console.error(
      JSON.stringify({
        msg: `Winston transport error (${transportName})`,
        'err.message': err.message,
        'err.code': err.code,
      }),
    );
  };
}

const combinedFileTransport = new DailyRotateFile({
  level,
  filename: 'logs/ptitpote-combined-%DATE%.log',
  ...dailyOpts,
});
const exceptionsFileTransport = new DailyRotateFile({
  filename: 'logs/ptitpote-exceptions-%DATE%.log',
  ...dailyOpts,
});
const rejectionsFileTransport = new DailyRotateFile({
  filename: 'logs/ptitpote-rejections-%DATE%.log',
  ...dailyOpts,
});

combinedFileTransport.on('error', onTransportError('combined'));
exceptionsFileTransport.on('error', onTransportError('exceptions'));
rejectionsFileTransport.on('error', onTransportError('rejections'));

export const logger = winston.createLogger({
  level,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    winston.format((info: any) => {
      const { timestamp: ts, level: lvl, message: msg, ...rest } = info;
      return {
        ts,
        lvl,
        logid: v4(),
        v,
        msg,
        ...rest,
      };
    })(),
    json({ deterministic: false }),
  ),
  transports: [new Console({ level }), combinedFileTransport],
  exceptionHandlers: [new Console(), exceptionsFileTransport],
  rejectionHandlers: [new Console(), rejectionsFileTransport],
});
