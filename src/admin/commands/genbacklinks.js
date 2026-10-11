import { Op } from 'sequelize'
import extractLinks from '../../utils/extractLinks.js'

export default {
    name: 'GENBACKLINKS',
    shortDesc: 'Regenerates the backlinks database.',
    longDesc: 'Rebuilds the links table by scanning all active page content, including include macros. May be slow on large wikis.',
    async f(command, stdout, username, ipAddress, options = {}) {
        await global.db.links.sequelize.transaction(async (transaction) => {
            const pages = await global.db.pages.findAll({
                where: { deleted: { [Op.or]: [false, null] } },
                transaction
            })
            stdout(`${pages.length} pages found.\n`)
            const links = pages.flatMap(page => extractLinks(page.title, page.content))
            stdout(`Committing changes (${links.length} entries)...\n`)
            await global.db.links.destroy({ where: {}, transaction })
            if (links.length > 0) await global.db.links.bulkCreate(links, { transaction })
        })
        await options.services?.renderCache?.invalidateAll()
        stdout('Done.\n')
    }
}
