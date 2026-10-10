import 'dotenv/config';
import { gateway } from './gateway/index.js';
import {
  ActivityType,
  PresenceUpdateStatus,
  type GatewayPresenceUpdateData,
} from 'discord-api-types/v10';
import { logger } from './logger.js';
import { t } from './i18n/index.js';
import config from './mikro-orm.config.js';
import { initORM } from './db/db.js';
import { registerGatewayHandlers } from './gateway/handlers.js';
import { connectWithRetry } from './gateway/connectWithRetry.js';
import { exitAfterFlush, superviseGateway } from './gateway/supervisor.js';

const dbServices = initORM(config, false);

const presence: GatewayPresenceUpdateData = {
  since: null,
  activities: [
    {
      name: t('gateway.activity.name'),
      state: t('gateway.activity.state'),
      type: ActivityType.Playing,
    },
  ],
  status: PresenceUpdateStatus.Online,
  afk: false,
};
// sent with Identify, so it also survives re-identifies without a Ready handler
gateway.presence = presence;

registerGatewayHandlers(gateway, dbServices);
superviseGateway(gateway);

dbServices
  .then(() => connectWithRetry(gateway))
  .then(() => {
    logger.debug('gateway connected');
  })
  .catch((err) => {
    logger.error('gateway error', { err });
    exitAfterFlush(1);
  });
