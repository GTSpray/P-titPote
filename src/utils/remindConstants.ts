export const REMIND_INTERVAL_MS = 60 * 60 * 1000;
export const REMIND_DAYS_MIN = 1;
export const REMIND_DAYS_MAX = 30;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isOlderThanIdleDays(
  lastMessageAt: Date,
  idleDays: number,
  now: Date = new Date(),
): boolean {
  return now.getTime() - lastMessageAt.getTime() >= idleDays * MS_PER_DAY;
}
