class RecentChangeService {
    constructor(recentChangeRepo) {
        this.recentChangeRepo = recentChangeRepo
    }

    sanitizeField(value) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        }
        const reg = /[&<>"'/]/g
        return String(value || '').replace(reg, (match) => map[match])
    }

    normalizeShow(show) {
        const parsed = Number(show || 30)
        if (Number.isNaN(parsed) || parsed <= 0) return 0
        return Math.min(parsed, 100)
    }

    async getRecentChanges(options = {}) {
        await this.recentChangeRepo.trimToLatest(100)

        let show = this.normalizeShow(options.show)
        if (show === 0) return []

        const isUnique = options.isUnique === true
        const excludeFile = options.excludeFile === true
        const editOnly = options.editOnly === true

        const changes = await this.recentChangeRepo.findAllDesc()
        const uniqueNames = new Set()
        const results = []

        for (const change of changes) {
            if (show <= 0) break

            const pageTitle = String(change.page || '')
            const lowerPage = pageTitle.toLowerCase()
            if (excludeFile && lowerPage.startsWith('file:')) continue
            if (lowerPage.startsWith('user:')) continue
            if (editOnly && change.type !== 'edit'
                && change.type !== 'create'
                && change.type !== 'delete'
                && change.type !== 'move') continue
            if (isUnique && uniqueNames.has(pageTitle)) continue

            const entry = change.toJSON ? change.toJSON() : { ...change }
            entry.page = this.sanitizeField(entry.page)
            entry.doneBy = this.sanitizeField(entry.doneBy)
            entry.comment = this.sanitizeField(entry.comment)

            results.push(entry)
            if (isUnique) uniqueNames.add(pageTitle)
            show -= 1
        }

        return results
    }
}

export default RecentChangeService
