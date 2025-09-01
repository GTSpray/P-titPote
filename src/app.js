import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { v4 } from 'uuid';
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { logger } from './logger.js';
import { slashcommands } from './commands/slash/index.js';

morgan.token('id', function (req) {
  return req.requestId
})

// Create an express app
const app = express();
app.use(express.json());
const PORT = process.env.APP_PORT || 3000;

app.use(function (req, res, next) {
  req.requestId = v4()
  const json = res.json.bind(res);
  res.json = (body) => {
    logger.debug('reponse', { reqId: req.requestId, body })
    json(body);
  }
  next()
})

app.use(morgan(
  function (tokens, req, res) {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      length: tokens.res(req, res, 'content-length'),
      time: Number.parseFloat(tokens['response-time'](req, res)),
      reqId: tokens['id'](req, res),
      version: process.env.npm_package_version
    });
  },
  {
    stream: {
      write: (message) => {
        const data = JSON.parse(message);
        logger.info("request", data);
      },
    },
  }
));



/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { type, data } = req.body;

  logger.debug('request.body', {
    reqId: req.requestId,
    body: req.body
  });
  logger.info(`interaction type`, { reqId: req.requestId, type });

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
    if (slashcommands.hasOwnProperty(name)) {
      logger.debug(`interaction handler`, { reqId: req.requestId, name });
      return slashcommands[name].handler(req, res);
    }
    logger.error(`unknown command`, { reqId: req.requestId, name });
    return res.status(400).json({ error: 'unknown command' });
  }

  logger.error(`unknown interaction type`, { reqId: req.requestId, type });
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, (err) => {
  if (err) {
    logger.error('startup error', err);
    return;
  }
  logger.info(`startup success`, { port: PORT, version: process.env.npm_package_version });
});
