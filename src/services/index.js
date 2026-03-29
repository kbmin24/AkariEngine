import PageService from './PageService.js'
import HistoryService from './HistoryService.js'
import SearchService from './SearchService.js'
import PermissionService from './PermissionService.js'
import CategoryService from './CategoryService.js'
import RecentChangeService from './RecentChangeService.js'
import ThreadService from './ThreadService.js'
import BlockService from './BlockService.js'
import ViewcountService from './ViewcountService.js'
import RenderService from './RenderService.js'

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
            this.permission,
            repositories.protections,
            repositories.recentchanges
        )
        this.history = new HistoryService(
            repositories.history,
            repositories.pages,
            this.permission
        )
        this.search = new SearchService(repositories.pages)
        this.viewcount = new ViewcountService(repositories.viewcounts)
        this.recentChanges = new RecentChangeService(repositories.recentchanges)
        this.thread = new ThreadService(repositories.threads, repositories.threadcomments, this.permission)
        this.render = new RenderService(repositories.pages, repositories.files)
    }
}

export default ServiceFactory;
