import 'dotenv/config';
import { Routes } from 'discord.js';
import { discordapi } from './utils.js'
import { slashcommands } from './slash-commands/index.js'


const payload = Object.keys(slashcommands).map((name) => {
  const {handler, ...rest} = slashcommands[name]; 
 return { name, ...rest };
});

console.log('try to register:');
console.dir(payload, {depth: null, colors: true})


discordapi.put(Routes.applicationCommands(process.env.APP_ID), {
  body: payload
})
  .then(() => console.log('ok'))
  .catch((error) => console.error(error))
  .finally(() => console.log('done'))
