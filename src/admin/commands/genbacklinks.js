export default {
    name: 'GENBACKLINKS',
    shortDesc: 'Regenerates the backlinks database.',
    longDesc: 'Truncates the links table and rebuilds it by scanning all page content. May be slow on large wikis.',
    async f(command, stdout, username, ipAddress, options = {}) {
        await global.db.links.destroy({ where: {}, truncate: true })

        const pages = await global.db.pages.findAll()
        stdout(`${pages.length} pages found.\n`)

        const res = []
        const simpleLink = /\[\[([^|\r\n]*?)\]\]/igm
        const labeledLink = /\[\[(.*?)\|(.*?)\]\]/igm

        for (const page of pages) {
            const found = new Set()

            const addLink = (target) => {
                const t = target.toLowerCase()
                if (t.startsWith('category') || t.startsWith('분류') ||
                    t.startsWith('http://') || t.startsWith('https://')) return
                if (found.has(target)) return
                found.add(target)
                res.push({ source: page.title, dest: target })
            }

            page.content.replace(simpleLink, (_match, p1) => { addLink(p1); return '' })
            page.content.replace(labeledLink, (_match, p1) => { addLink(p1); return '' })
        }

        stdout(`Committing changes (${res.length} entries)...\n`)
        await global.db.links.bulkCreate(res)
        stdout('Done.\n')
    }
}