export default {
    name: 'CLEANCATEGORIES',
    shortDesc: 'Resets the category database.',
    longDesc: 'Scans all pages and removes category entries for pages that no longer exist.',
    async f(command, stdout, username, ipAddress, options = {}) {
        const cat = await global.db.category.findAll()
        for (const val of cat) {
            if (!(await global.db.pages.findOne({ where: { title: val.page } }))) {
                await global.db.category.destroy({ where: { page: val.page } })
            }
        }
        stdout('Done.\n')
    }
}