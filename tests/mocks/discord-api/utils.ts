export type BitFieldFlag = any;
import { randomBytes, randomInt } from "crypto";

function conditionnal(returnArr: boolean, str: string) {
  if (returnArr) {
    return str.split("");
  }
  return [];
}

const cryptoRandom = () =>
  parseInt(randomBytes(4).toString("hex"), 16) / (0xffffffff + 1);

const cryptoRandomString = (
  charLength: number,
  charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
) => {
  return Array.apply(null, Array(charLength))
    .map(() => charset.charAt(Math.floor(cryptoRandom() * charset.length)))
    .join("");
};

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
  const numberCharSet = "012345678901234567890123456789";
  const charSet = [
    ...conditionnal(!!letter, letterCharSet),
    ...conditionnal(!!number, numberCharSet),
    ...conditionnal(!!uppercase, letterCharSet.toUpperCase()),
  ].join("");

  return cryptoRandomString(length, charSet);
}

export const randomDiscordId18 = () =>
  getRandomString({ length: 18, number: true });
export const randomDiscordId19 = () =>
  getRandomString({ length: 19, number: true });
export const randomDiscordId16 = () =>
  getRandomString({ length: 16, number: true });
