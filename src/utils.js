import 'dotenv/config';

import { REST } from 'discord.js';

export const discordapi = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

export function getRandomEmoji() {
  const emojiList = [ '😄', '😌', '🤓', '😎', '🤖', '😶‍🌫️', '👋', '✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

const emojiRegex = /<a?\:([a-z _ 0-9]+)\:([0-9]{18,20})>/gmi;
export function extractEmoji(text) {
  let m;
  const acc = []
  while ((m = emojiRegex.exec(text)) !== null) {
    if (m.index === emojiRegex.lastIndex) {
      emojiRegex.lastIndex++;
    }
    const [input, name, id] = m;
    acc.push({
      id,
      name,
      input
    });
  }
  return acc
}

export async function getEmojiUrl(emojiId) {
  const response = await fetch(`https://cdn.discordapp.com/emojis/${emojiId}.gif`);
  return `https://cdn.discordapp.com/emojis/${emojiId}.${response.ok ? 'gif' : 'png'}`
}