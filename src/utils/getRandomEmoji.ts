export function getRandomEmoji() {
  const emojiList = ["😄", "😌", "🤓", "😎", "🤖", "😶‍🌫️", "👋", "✨"];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}
