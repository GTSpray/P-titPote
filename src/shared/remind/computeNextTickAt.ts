import { MS_PER_DAY } from './constants.js';

export function computeNextTickAt(from: Date, idleDays: number): Date {
  return new Date(from.getTime() + idleDays * MS_PER_DAY);
}
