export type BitFieldFlag = any;

function shuffle(arr: any[]) {
  const arrCopy = [...arr];
  let currentIndex = arrCopy.length;
  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [arrCopy[currentIndex], arrCopy[randomIndex]] = [
      arrCopy[randomIndex],
      arrCopy[currentIndex],
    ];
  }

  return arrCopy;
}

function conditionnal(returnArr: boolean, str: string) {
  if (returnArr) {
    return str.split("");
  }
  return [];
}

type RandomStringOptions = {
  length?: number;
  letter?: boolean;
  uppercase?: boolean;
  number?: boolean;
};
export function getRandomString({
  length = 10,
  letter,
  number,
  uppercase,
}: RandomStringOptions) {
  const letterCharSet = "abcdefghijklmnopqrstuvwxyz";
  const numberCharSet = "0123456789";
  const charSet = shuffle([
    ...conditionnal(!!letter, letterCharSet),
    ...conditionnal(!!number, numberCharSet),
    ...conditionnal(!!uppercase, letterCharSet.toUpperCase()),
  ]);

  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charSet.length);
    result += charSet[randomIndex];
  }
  return result;
}

export const randomDiscordId18 = () =>
  getRandomString({ length: 18, number: true });
export const randomDiscordId19 = () =>
  getRandomString({ length: 19, number: true });
export const randomDiscordId16 = () =>
  getRandomString({ length: 16, number: true });
