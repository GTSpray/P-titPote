export type ExtractedEmoji = {
  id: string;
  name: string;
  input: string;
};
const emojiRegex = /<a?\:([a-z _ 0-9]+)\:([0-9]{18,20})>/gim;
export function extractEmoji(text: string): ExtractedEmoji[] {
  let m;
  const acc: ExtractedEmoji[] = [];
  while ((m = emojiRegex.exec(text)) !== null) {
    if (m.index === emojiRegex.lastIndex) {
      emojiRegex.lastIndex++;
    }
    const [input, name, id] = m;
    acc.push({
      id,
      name,
      input,
    });
  }
  return acc;
}
