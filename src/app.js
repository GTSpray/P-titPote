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

morgan.token('requestId', function (req) {
  return req.requestId
})

// Create an express app
const app = express();

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
      status: Number.parseInt(tokens.status(req, res)),
      length: Number.parseInt(tokens.res(req, res, 'content-length')),
      duration: Number.parseFloat(tokens['response-time'](req, res)),
      reqId: tokens['requestId'](req, res)
    });
  },
  {
    stream: {
      write: (message) => {
        const data = JSON.parse(message);
        logger.http("request", data);
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
  const reqId = req.requestId;

  logger.debug('request.body', {
    reqId,
    body: req.body
  });
  logger.info(`interaction type`, { reqId, type });

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
      logger.debug(`interaction handler`, { reqId, name });
      return slashcommands[name].handler(req, res);
    }
    logger.error(`unknown command`, { reqId, name });
    return res.status(400).json({ error: 'unknown command' });
  }

  logger.error(`unknown interaction type`, { reqId, type });
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.use(express.json()); // after interaction rout to prevent We recommend disabling middleware for interaction routes so that req.body is a raw buffer.

app.listen(PORT, (err) => {
  if (err) {
    logger.error('startup error', err);
    return;
  }
  logger.info(`startup success`, { port: PORT });
});
