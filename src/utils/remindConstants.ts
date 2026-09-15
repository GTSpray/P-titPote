


const s = 1000;
const m = 60 * s;
const h = 60 * m;

export const REMIND_INTERVAL_MS = 10 * m;
export const REMIND_DAYS_MIN = 1;
export const REMIND_DAYS_MAX = 30;

export const MS_PER_DAY = 24 * h;

export function isOlderThanIdleDays(
  lastMessageAt: Date,
  idleDays: number,
  now: Date = new Date(),
): boolean {
  return now.getTime() - lastMessageAt.getTime() >= idleDays * MS_PER_DAY;
}

export function computeNextTickAt(from: Date, idleDays: number): Date {
  return new Date(from.getTime() + idleDays * MS_PER_DAY);
}
