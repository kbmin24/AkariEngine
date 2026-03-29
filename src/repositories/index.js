import PageRepository from './PageRepository.js'
import FileRepository from './FileRepository.js'
import UserRepository from './UserRepository.js'
import PermissionRepository from './PermissionRepository.js'
import CategoryRepository from './CategoryRepository.js'
import HistoryRepository from './HistoryRepository.js'
import BlockRepository from './BlockRepository.js'
import ProtectRepository from './ProtectRepository.js'
import RecentChangeRepository from './RecentChangeRepository.js'
import ThreadRepository from './ThreadRepository.js'
import ThreadCommentRepository from './ThreadCommentRepository.js'
import ViewcountRepository from './ViewcountRepository.js'

class RepositoryFactory {
    constructor(db) {
        this.pages = new PageRepository(db.pages, {
            recentChangesModel: db.recentchanges,
            historyModel: db.history,
            categoryModel: db.category,
            linkModel: db.links,
            fileModel: db.mfile,
            protectModel: db.protect,
            threadModel: db.thread
        })
        this.users = new UserRepository(db.users)
        this.permissions = new PermissionRepository(db.perm)
        this.categories = new CategoryRepository(db.category)
        this.history = new HistoryRepository(db.history)
        this.recentchanges = new RecentChangeRepository(db.recentchanges)
        this.threads = new ThreadRepository(db.thread)
        this.threadcomments = new ThreadCommentRepository(db.threadcomment)
        this.blocks = new BlockRepository(db.block)
        this.protections = new ProtectRepository(db.protect)
        this.viewcounts = new ViewcountRepository(db.viewcount)
        this.files = new FileRepository(db.mfile)
    }
}

export default RepositoryFactory;
