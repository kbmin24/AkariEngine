import { jest } from '@jest/globals';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { Sequelize } from 'sequelize';

const createClient = jest.fn();
const logger = { error: jest.fn() };
jest.unstable_mockModule('redis', () => ({ createClient }));
const { initRedis } = await import('./redisClient.js');
const { createSessionStore } = await import('./sessionStore.js');

beforeEach(() => jest.clearAllMocks());

test.each([undefined, null, {}, { enabled: false }, { host: 'redis://localhost:6379' }, { enabled: 'true' }])(
    'unconfigured or disabled Redis uses the database store: %j', async (settings) => {
        const client = await initRedis(settings, logger);
        const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
        const store = createSessionStore(db, client);
        try {
            await store.Session.sync();
            expect(client).toBeNull();
            expect(store).toBeInstanceOf(session.Store);
            expect(store).not.toBeInstanceOf(RedisStore);
            expect(createClient).not.toHaveBeenCalled();
            await new Promise((resolve, reject) => store.set('test', { username: 'Alice' }, (error) => error ? reject(error) : resolve()));
            const saved = await new Promise((resolve, reject) => store.get('test', (error, value) => error ? reject(error) : resolve(value)));
            expect(saved.username).toBe('Alice');
        } finally {
            clearInterval(store._expirationInterval);
            await db.close();
        }
    }
);

test('enabled Redis connects before returning a client for the session store', async () => {
    const client = { on: jest.fn(), connect: jest.fn().mockResolvedValue(), destroy: jest.fn() };
    createClient.mockReturnValue(client);
    const result = await initRedis({ enabled: true, host: 'redis://localhost:6379', password: 'secret' }, logger);
    expect(result).toBe(client);
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ url: 'redis://localhost:6379', password: 'secret' }));
    expect(client.connect).toHaveBeenCalled();
    const store = createSessionStore(null, result);
    expect(store).toBeInstanceOf(RedisStore);
    expect(store.prefix).toBe('akari:session:');
    const errorHandler = client.on.mock.calls.find(([event]) => event === 'error')[1];
    errorHandler(new Error('connection lost'));
    expect(logger.error).toHaveBeenCalled();
});

test('enabled Redis connection failure rejects instead of selecting database sessions', async () => {
    const client = { on: jest.fn(), connect: jest.fn().mockRejectedValue(new Error('connection refused')), destroy: jest.fn() };
    createClient.mockReturnValue(client);
    await expect(initRedis({ enabled: true, host: 'redis://localhost:6379' }, logger)).rejects.toThrow('connection refused');
    expect(client.destroy).toHaveBeenCalled();
});

test.each([undefined, '', 'http://127.0.0.1:6379'])('enabled Redis rejects invalid host %j', async (host) => {
    await expect(initRedis({ enabled: true, host }, logger)).rejects.toThrow('redis.host');
    expect(createClient).not.toHaveBeenCalled();
});

test('Redis initialization timeout closes the client and rejects startup', async () => {
    jest.useFakeTimers();
    const client = { on: jest.fn(), connect: jest.fn(() => new Promise(() => {})), destroy: jest.fn() };
    createClient.mockReturnValue(client);
    try {
        const initialization = initRedis({ enabled: true, host: 'redis://localhost:6379' }, logger);
        const rejection = expect(initialization).rejects.toThrow('timed out');
        await jest.advanceTimersByTimeAsync(5000);
        await rejection;
        expect(client.destroy).toHaveBeenCalled();
    } finally {
        jest.useRealTimers();
    }
});
