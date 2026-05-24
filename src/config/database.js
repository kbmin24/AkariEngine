import path from 'path'
import { Sequelize } from 'sequelize'
import config from './index.js'

function createSequelizeInstance() {
    const dbConfig = config.database

    if (dbConfig.type === 'sqlite') {
        return new Sequelize({
            dialect: 'sqlite',
            storage: path.join(config.basePath, dbConfig.sqlite_options.storage),
            logging: false
        })
    }

    if (dbConfig.type === 'mariadb') {
        return new Sequelize(
            dbConfig.mariadb_options.database,
            dbConfig.mariadb_options.username,
            dbConfig.mariadb_options.password,
            {
                dialect: 'mariadb',
                dialectOptions: { connectTimeout: 1000 },
                logging: false
            }
        )
    }

    throw new Error(`Invalid database type: ${dbConfig.type}`)
}

export { createSequelizeInstance }
