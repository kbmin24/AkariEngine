const PageService = require('./PageService')
const PermissionService = require('./PermissionService')
const CategoryService = require('./CategoryService')
const RecentChangeService = require('./RecentChangeService')
const ThreadService = require('./ThreadService')
const BlockService = require('./BlockService')

class ServiceFactory {
    constructor(repositories) {
        this.category = new CategoryService(repositories.categories)
        this.block = new BlockService(
            repositories.blocks,
            repositories.users,
            repositories.permissions
        )
        this.permission = new PermissionService(
            repositories.permissions,
            repositories.blocks,
            repositories.protections,
            this.block
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
