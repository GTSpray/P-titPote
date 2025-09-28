import "dotenv/config";
import express from "express";
import { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { v4 } from "uuid";
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";

import { gateway } from "./gateway/index.js";
import { GatewayDispatchEvents } from "discord.js";

import { logger } from "./logger.js";
import { slashcommands } from "./commands/slash/index.js";

import config from "./mikro-orm.config.js";
import { initORM } from "./db/db.js";

const orm = initORM(config);

morgan.token("requestId", (req) => {
  return (<any>req).requestId;
});

const app = express();

const PORT = process.env.APP_PORT || 3000;

app.use(function (req: Request, res: Response, next: NextFunction) {
  req.requestId = v4();
  res.set("x-request-id", req.requestId);
  next();
});

app.use(
  morgan(
    function (tokens, req, res) {
      return JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number.parseInt(<string>tokens.status(req, res)),
        length: Number.parseInt(<string>tokens.res(req, res, "content-length")),
        duration: Number.parseFloat(<string>tokens["response-time"](req, res)),
        reqId: tokens["requestId"](req, res),
      });
    },
    {
      stream: {
        write: (message) => {
          const data = JSON.parse(message);
          logger.http("request", data);
        },
      },
    },
  ),
);

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction id, type and data
    const { type, data } = req.body;
    const reqId = req.requestId;

    logger.debug("request.body", {
      reqId,
      body: req.body,
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
      if (slashcommands.hasOwnProperty(name) && slashcommands[name]) {
        logger.debug(`interaction handler`, { reqId, name });
        const dbServices = await orm;
        return slashcommands[name].handler({ req, res, dbServices });
      }
      logger.error(`unknown command`, { reqId, name });
      return res.status(400).json({ error: "unknown command" });
    }

    logger.error(`unknown interaction type`, { reqId, type });
    return res.status(400).json({ error: "unknown interaction type" });
  },
);

app.use(express.json()); // after interaction route to prevent We recommend disabling middleware for interaction routes so that req.body is a raw buffer.

app.listen(PORT, (err) => {
  if (err) {
    logger.error("startup error", err);
    return;
  }
  logger.info(`startup success`, { port: PORT });
});

gateway.on(GatewayDispatchEvents.MessageReactionAdd, (_s, p) => {
  const { emoji, user_id } = p;
  logger.info("emoji recat", { user_id, emoji });
});

gateway
  .connect()
  .then(() => {
    logger.debug("gateway connected");
  })
  .catch((err) => {
    logger.error("gateway", { err });
  })
  .finally(() => {
    logger.debug("gateway");
  });
