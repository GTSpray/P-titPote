import "dotenv/config";

import { GatewaySocket } from "./GatewaySocket.js";

if (!process.env.BOT_TOKEN) {
  throw Error("no APP_ID provided in env");
}

export const gateway = new GatewaySocket(process.env.BOT_TOKEN, 4);

