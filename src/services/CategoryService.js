class CategoryService {
    constructor(categoryRepo) {
        this.categoryRepo = categoryRepo
    }

    extractFromContent(content = '') {
        const categoryRegex = /\[\[(?:Category|분류):(.*?)\]\]/igm
        const matches = [...content.matchAll(categoryRegex)]
        return matches.map((m) => (m[1] || '').trim()).filter(Boolean)
    }

    async registerForPage(pageTitle, categories) {
        await this.categoryRepo.deleteByPage(pageTitle)
        for (const category of categories) {
            await this.categoryRepo.create({
                page: pageTitle,
                category
            })
        }
    }

    async getPagesByCategory(category) {
        return this.categoryRepo.findByCategory(category)
    }

    async getCategoriesForPage(pageTitle) {
        return this.categoryRepo.findByPage(pageTitle)
    }

    async getCategoryViewModel(category, { from, to } = {}) {
        const pgSize = 30
        let normalizedFrom = Number(from)
        let normalizedTo = Number(to)

        if (!Number.isInteger(normalizedFrom) || normalizedFrom < 1) normalizedFrom = 1
        if (!Number.isInteger(normalizedTo) || normalizedTo < normalizedFrom) normalizedTo = normalizedFrom + pgSize - 1

        const requestedSize = normalizedTo - normalizedFrom + 1
        const limit = Math.min(requestedSize, pgSize)
        const offset = normalizedFrom - 1

        const result = await this.categoryRepo.findAndCountByCategory(category, { limit, offset })

        normalizedTo = normalizedFrom + result.rows.length - 1
        if (normalizedTo > result.count) normalizedTo = result.count
        if (result.count === 0) normalizedTo = 0

        return {
            category,
            pages: result,
            from: normalizedFrom,
            to: normalizedTo,
            pageCount: result.count,
            pgSize
        }
    }
}

export default CategoryService
