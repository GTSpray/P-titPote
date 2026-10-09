export const DELETED_AT = new Date('1970-01-01T00:00:00.000Z');

export type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
};

export function newTimestamps(now = new Date()): Timestamps {
  return {
    createdAt: now,
    updatedAt: now,
    deletedAt: DELETED_AT,
  };
}
