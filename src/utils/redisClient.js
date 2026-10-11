import { createClient } from 'redis';

export async function initRedis(settings, logger) {
    if (settings?.enabled !== true) return null;

    let url;
    try {
        url = new URL(settings.host);
    } catch {
        throw new Error('redis.host must be a valid redis:// or rediss:// URL');
    }
    if (!['redis:', 'rediss:'].includes(url.protocol)) {
        throw new Error('redis.host must be a valid redis:// or rediss:// URL');
    }

    let connected = false;
    const client = createClient({
        url: settings.host,
        password: settings.password || undefined,
        disableOfflineQueue: true,
        socket: {
            connectTimeout: 5000,
            reconnectStrategy: (retries) => connected ? Math.min(100 * (retries + 1), 3000) : false
        }
    });
    client.on('error', (error) => logger.error('Redis connection error', error));
    let timeout;
    try {
        await Promise.race([
            client.connect(),
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Redis initialization timed out')), 5000);
            })
        ]);
        connected = true;
        return client;
    } catch (error) {
        client.destroy();
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
