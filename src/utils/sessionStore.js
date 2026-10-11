import session from 'express-session';
import sessionStoreFactory from 'express-session-sequelize';
import { RedisStore } from 'connect-redis';

export function createSessionStore(sequelize, redisClient) {
    if (redisClient) {
        return new RedisStore({ client: redisClient, prefix: 'akari:session:' });
    }
    const SequelizeStore = sessionStoreFactory(session.Store);
    return new SequelizeStore({ db: sequelize });
}
