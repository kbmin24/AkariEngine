import { jest } from '@jest/globals';

const io = { use: jest.fn(), on: jest.fn(), adapter: jest.fn() };
const createAdapter = jest.fn(() => 'redis-adapter');
jest.unstable_mockModule('socket.io', () => ({ Server: jest.fn(() => io) }));
jest.unstable_mockModule('@socket.io/redis-adapter', () => ({ createAdapter }));
jest.unstable_mockModule('express-socket.io-session', () => ({ default: jest.fn() }));
jest.unstable_mockModule('./developerConsole.socket.js', () => ({ default: jest.fn() }));
jest.unstable_mockModule('./thread.socket.js', () => ({ default: jest.fn() }));
const { default: registerSocketServer } = await import('./index.js');

beforeEach(() => jest.clearAllMocks());

test('Redis connections enable broadcasts across Socket.IO servers', () => {
    const redisClient = {};
    const redisSubscriber = {};
    const app = { locals: {} };
    expect(registerSocketServer({ app, redisClient, redisSubscriber })).toBe(io);
    expect(createAdapter).toHaveBeenCalledWith(redisClient, redisSubscriber, { key: 'akari:socket.io' });
    expect(io.adapter).toHaveBeenCalledWith('redis-adapter');
    expect(app.locals.io).toBe(io);
});

test('disabled Redis retains the default Socket.IO adapter', () => {
    registerSocketServer({ app: { locals: {} }, redisClient: null, redisSubscriber: null });
    expect(createAdapter).not.toHaveBeenCalled();
    expect(io.adapter).not.toHaveBeenCalled();
});
