import "dotenv/config";

import { GatewaySocket } from "./GatewaySocket.js";
import { t } from "../i18n/index.js";

if (!process.env.BOT_TOKEN) {
  throw Error(t("startup.noTokenEnv"));
}

export const gateway = new GatewaySocket(process.env.BOT_TOKEN);
