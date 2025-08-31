import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js'

const payload = Object.keys(commands).map((name) => {
  const {handler, ...rest} = commands[name]; 
 return { name, ...rest };
});

console.log('try to register:');
console.dir(payload, {depth: null, colors: true})

const discord = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
discord.put(Routes.applicationCommands(process.env.APP_ID), {
  body: payload
})
  .then(() => console.log('ok'))
  .catch(() => console.log('fail'))
  .finally(() => console.log('done'))
