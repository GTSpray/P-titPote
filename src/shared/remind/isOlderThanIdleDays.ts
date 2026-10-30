import { MS_PER_DAY } from './constants.js';

export function isOlderThanIdleDays(
  lastMessageAt: Date,
  idleDays: number,
  now: Date = new Date(),
): boolean {
  return now.getTime() - lastMessageAt.getTime() >= idleDays * MS_PER_DAY;
}
