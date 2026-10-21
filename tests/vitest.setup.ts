import { DiscrodRESTMock } from './mocks/discordjs.js';
import { vi } from 'vitest';
import './customMatchers/customMatchers.js';
import { initORM } from './initORM.js';
import { WebSocketMock } from './mocks/WebSocketMock.js';

// Keep APP_ID fake even if the container/.env provides a real bot application id.
process.env.APP_ID = '1234567890123456789';

vi.mock('../src/logger.js');

vi.mock('ws', () => ({
  default: WebSocketMock,
}));

vi.mock('discord.js', async (importOriginal) => {
  const mod: any = await importOriginal();
  return {
    ...mod,
    REST: DiscrodRESTMock,
  };
});

beforeAll(async () => {
  await initORM();
});

afterAll(async () => {
  const { orm } = await initORM();
  await orm.close(true);
});

afterEach(() => {
  DiscrodRESTMock.clear();
});
