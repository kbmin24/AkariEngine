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
}

export default CategoryService
