const PageService = require('./PageService')
const PermissionService = require('./PermissionService')
const CategoryService = require('./CategoryService')

class ServiceFactory {
    constructor(repositories) {
        this.category = new CategoryService(repositories.categories)
        this.permission = new PermissionService(
            repositories.permissions,
            repositories.blocks,
            repositories.protections
        )
        this.page = new PageService(
            repositories.pages,
            repositories.history,
            this.category,
            this.permission
        )
    }
}

module.exports = ServiceFactory
