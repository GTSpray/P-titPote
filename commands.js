import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';
InstallGlobalCommands(process.env.APP_ID, [
  {
    name: 'test',
    description: 'Basic command',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
  {
    name: 'steal',
    description: 'Récupère une emote dans les 1à derniers messages',
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
]);
