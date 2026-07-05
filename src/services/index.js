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
import AdminService from './AdminService.js'
import LoginHistoryService from './LoginHistoryService.js'
import UserService from './UserService.js'
import RecentDiscussService from './RecentDiscussService.js'
import FileService from './FileService.js'
import MeilisearchRepository from '../repositories/MeilisearchRepository.js'

class ServiceFactory {
    constructor(repositories, { msIndex = null } = {}) {
        const msRepo = msIndex ? new MeilisearchRepository(msIndex) : null
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
            repositories.recentchanges,
            msRepo
        )
        this.history = new HistoryService(
            repositories.history,
            repositories.pages,
            this.permission
        )
        this.search = new SearchService(repositories.pages, msRepo)
        this.viewcount = new ViewcountService(repositories.viewcounts)
        this.recentChanges = new RecentChangeService(repositories.recentchanges)
        this.thread = new ThreadService(
            repositories.threads,
            repositories.threadcomments,
            repositories.pages,
            repositories.recentdiscuss,
            this.permission)
        this.render = new RenderService(repositories.pages, repositories.files)
        this.admin = new AdminService(
            repositories.adminlog,
            repositories.permissions,
            repositories.pages,
            repositories.protections,
            repositories.users
        )
        this.loginHistory = new LoginHistoryService(repositories.loginHistory, repositories.adminlog)
        this.user = new UserService(this.permission, repositories.users, repositories.settings)
        this.recentDiscuss = new RecentDiscussService(repositories.recentdiscuss, repositories.threads)
        this.file = new FileService(this.page, this.permission, repositories.files, repositories.pages)
    }
}

export default ServiceFactory