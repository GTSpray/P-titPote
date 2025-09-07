export async function getEmojiUrl(emojiId: string) {
  const response = await fetch(
    `https://cdn.discordapp.com/emojis/${emojiId}.gif`,
  );
  return `https://cdn.discordapp.com/emojis/${emojiId}.${response.ok ? "gif" : "png"}`;
}
