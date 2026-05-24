import config from '../../config/index.js'
import { createSequelizeInstance } from '../../config/database.js'
import pagesFactory from '../../models/page.model.js'
import PageRepository from '../../repositories/PageRepository.js'
import MeilisearchRepository from '../../repositories/MeilisearchRepository.js'
import { initMeilisearch } from '../../utils/meilisearchClient.js'


export default {
    name: 'REINDEX',
    shortDesc: 'Reindexes the Meilisearch search index.',
    longDesc: 'Usage: REINDEX\nReindexes the Meilisearch search index. Deletes all existing indexes. This may take a long time.',
    async f(command, stdout, username, ipAddress, _options = {}) {
        const BATCH_SIZE = 100

        const msCfg = config.settings.meilisearch
        if (!msCfg?.enabled) {
            stdout('Meilisearch not enabled in LocalSettings.json. Exiting.\n')
            process.exit(0)
        }

        try {
            const sequelize = createSequelizeInstance()
            const pageModel = pagesFactory(sequelize)
            await sequelize.sync()

            const pageRepo = new PageRepository(pageModel)
            const msIndex = await initMeilisearch(msCfg)
            const msRepo = new MeilisearchRepository(msIndex)

            stdout('Deleting all documents from Meilisearch index...  ')
            await msRepo.deleteAllDocuments()
            stdout('Done.\n')

            let offset = 0
            let indexed = 0

            const { count } = await pageRepo.findAllPaginated(0, 1)
            stdout(`Found ${count} pages. Indexing in batches of ${BATCH_SIZE}...\n`)

            while (true) {
                const { rows } = await pageRepo.findAllPaginated(offset, BATCH_SIZE)
                if (rows.length === 0) break

                await msRepo.addDocuments(rows)
                indexed += rows.length
                stdout(`${indexed}/${count}...`)

                offset += BATCH_SIZE
                if (rows.length < BATCH_SIZE) break
            }

            stdout(`\nDone. ${indexed} pages indexed.\n`)
            await sequelize.close()
        } catch (e) {
            stdout(`Reindexing failed: ${e.message}\n`)
        }
    }
}