const PageService = require('./PageService')
const PermissionService = require('./PermissionService')
const CategoryService = require('./CategoryService')
const RecentChangeService = require('./RecentChangeService')
const ThreadService = require('./ThreadService')

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
        this.recentChanges = new RecentChangeService(repositories.recentchanges)
        this.thread = new ThreadService(repositories.threads, repositories.threadcomments, this.permission)
    }
}

module.exports = ServiceFactory
