import "dotenv/config";

import { GatewaySocket } from "./GatewaySocket.js";
import { GWSEvent } from "./gatewaytypes.js";
import { logger } from "../logger.js";

if (!process.env.BOT_TOKEN) {
  throw Error("no APP_ID provided in env");
}

export const gateway = new GatewaySocket(process.env.BOT_TOKEN, 4);

gateway.on(GWSEvent.Debug, (shard, debugmsg, meta?) => {
  logger.debug("gateway", { shard, debugmsg, meta });
});

gateway.on(GWSEvent.Payload, (shard, meta) => {
  logger.debug("gateway payload", { shard, meta });
});
