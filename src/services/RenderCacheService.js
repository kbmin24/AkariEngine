import { createHash, randomUUID } from 'node:crypto';
import logger from '../utils/logger.js';

const PREFIX = 'akari:render:v1:';
const EPOCH_KEY = `${PREFIX}epoch`;

export function cacheExpiresAt(now = new Date(), timeDependent = false) {
    const ordinary = now.getTime() + 300000;
    if (!timeDependent) return ordinary;
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.min(ordinary, midnight.getTime());
}

export async function withPageChanges(cache, changes, operation) {
    try {
        return await operation();
    } finally {
        for (const change of changes) {
            await cache?.invalidateForPageChange(change.title, change);
        }
    }
}

class RenderCacheService {
    constructor(client, pageRepository) {
        this.client = client;
        this.pageRepository = pageRepository;
        this.dirty = true;
        client?.on('reconnecting', () => { this.dirty = true; });
    }

    async run(operation, fallback = null) {
        if (!this.client?.isReady) {
            this.dirty = true;
            return fallback;
        }
        try {
            if (this.dirty) {
                await this.client.set(EPOCH_KEY, randomUUID());
                this.dirty = false;
            }
            return await operation();
        } catch (error) {
            this.dirty = true;
            logger.warn('Rendered page cache unavailable', { error: error.message });
            return fallback;
        }
    }

    async epoch() {
        await this.client.set(EPOCH_KEY, randomUUID(), { NX: true });
        return this.client.get(EPOCH_KEY);
    }

    keys(epoch, title) {
        const digest = createHash('sha256').update(title).digest('hex');
        return {
            cacheKey: `${PREFIX}${epoch}:${digest}:html`,
            generationKey: `${PREFIX}${epoch}:${digest}:generation`
        };
    }

    async get(title, locale, identity) {
        return this.run(async () => {
            const epoch = await this.epoch();
            const keys = this.keys(epoch, title);
            await this.client.set(keys.generationKey, randomUUID(), { NX: true, EX: 600 });
            const [generation, value] = await this.client.multi()
                .get(keys.generationKey).hGet(keys.cacheKey, locale).exec();
            const entry = value ? JSON.parse(value) : null;
            const bundle = entry?.generation === generation && entry.identity === identity && entry.expiresAt > Date.now()
                ? entry.bundle : null;
            return { ...keys, epoch, generation, locale, bundle };
        });
    }

    async putIfUnchanged(snapshot, identity, bundle, expiresAt) {
        if (!snapshot) return false;
        return this.run(async () => {
            const ttl = expiresAt - Date.now();
            if (ttl <= 0) return false;
            const value = JSON.stringify({ generation: snapshot.generation, identity, bundle, expiresAt });
            const published = await this.client.eval(`
                if redis.call('GET', KEYS[1]) ~= ARGV[1] or redis.call('GET', KEYS[2]) ~= ARGV[2] then return 0 end
                redis.call('HSET', KEYS[3], ARGV[3], ARGV[4])
                redis.call('PEXPIRE', KEYS[3], ARGV[5])
                return 1
            `, {
                keys: [EPOCH_KEY, snapshot.generationKey, snapshot.cacheKey],
                arguments: [snapshot.epoch, snapshot.generation, snapshot.locale, value, String(ttl)]
            });
            return published === 1;
        }, false);
    }

    async invalidateAll() {
        return this.run(() => this.client.set(EPOCH_KEY, randomUUID()));
    }

    async invalidatePages(titles) {
        return this.run(async () => {
            const epoch = await this.epoch();
            const transaction = this.client.multi();
            for (const title of new Set(titles)) {
                const keys = this.keys(epoch, title);
                transaction.set(keys.generationKey, randomUUID(), { EX: 600 }).del(keys.cacheKey);
            }
            await transaction.exec();
        });
    }

    async invalidateForPageChange(title, { existenceChanged = false } = {}) {
        if (!this.client) return [];
        // Dependency errors must also disable old entries, rather than break a committed edit.
        try {
            const affected = new Set([title]);
            let sources = await this.pageRepository.findIncomingLinks([title], !existenceChanged);
            while (sources.length > 0) {
                const next = [...new Set(sources.map(link => link.source))].filter(source => !affected.has(source));
                if (!next.length) break;
                for (const source of next) affected.add(source);
                sources = await this.pageRepository.findIncomingLinks(next, true);
            }
            await this.invalidatePages([...affected]);
            return [...affected];
        } catch (error) {
            await this.invalidateAll();
            logger.warn('Rendered page dependency invalidation failed', { title, error: error.message });
            return [];
        }
    }
}

export default RenderCacheService;
