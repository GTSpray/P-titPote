import 'dotenv/config';
import { REST, Routes } from 'discord.js';
const discord = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
discord.put(Routes.applicationCommands(process.env.APP_ID), {
  body: [
    {
      name: 'test',
      description: 'Basic command',
      type: 1,
      integration_types: [0, 1],
      contexts: [0, 1, 2],
    },
    {
      name: 'steal',
      description: 'Récupère les 3 dernières emotes dans les 10 derniers messages de ce chan',
      type: 1,
      integration_types: [0, 1],
      contexts: [0, 1, 2],
    },
  ]
})
.then(()=> console.log('ok'))
.catch(()=> console.log('fail'))
.finally(()=> console.log('done'))
