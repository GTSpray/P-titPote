export const splitStringIntoChunks = (
  content: string,
  maxLength: number,
): string[] => {
  const [first, ...lines] = content.replaceAll('\r\n', '\n').split('\n');
  return lines.reduce(
    (acc, line) => {
      const lastIndexMessageContent = acc.length - 1;
      const lastMessageContent = acc[lastIndexMessageContent];
      if (line.length + lastMessageContent.length < maxLength) {
        acc[lastIndexMessageContent] = `${lastMessageContent}\n${line}`;
      } else {
        acc.push(line);
      }
      return acc;
    },
    [first],
  );
};
