import "dotenv/config";
import express from "express";
import { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { v4 } from "uuid";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";

import { logger } from "./logger.js";
import { slashcommands } from "./commands/slash/index.js";

import config from "./mikro-orm.config.js";
import { initORM } from "./db/db.js";
import { okComponnents } from "./commands/commonMessages.js";

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

    if (type === InteractionType.MESSAGE_COMPONENT) {
      return res.json({
        type: 9,
        data: {
          custom_id: "bug_modal",
          title: "Bug Report",
          components: [
            {
              type: 18,
              label: "What's your favorite bug?",
              component: {
                type: 3,
                custom_id: "bug_string_select",
                placeholder: "Choose...",
                options: [
                  {
                    label: "Ant",
                    value: "ant",
                    description: "(best option)",
                    emoji: {
                      name: "🐜",
                    },
                  },
                  {
                    label: "Butterfly",
                    value: "butterfly",
                    emoji: {
                      name: "🦋",
                    },
                  },
                  {
                    label: "Caterpillar",
                    value: "caterpillar",
                    emoji: {
                      name: "🐛",
                    },
                  },
                ],
              },
            },
            {
              type: 18,
              label: "Why is it your favorite?",
              description: "Please provide as much detail as possible!",
              component: {
                type: 4,
                custom_id: "bug_explanation",
                style: 2,
                min_length: 10,
                max_length: 4000,
                placeholder: "Write your explanation here...",
                required: true,
              },
            },
          ],
        },
      });
    }

    if (type === InteractionType.MODAL_SUBMIT) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: "A voté!",
        },
      });
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
