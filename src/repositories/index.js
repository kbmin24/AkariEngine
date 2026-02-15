const PageRepository = require('./PageRepository')
const UserRepository = require('./UserRepository')
const PermissionRepository = require('./PermissionRepository')
const CategoryRepository = require('./CategoryRepository')
const HistoryRepository = require('./HistoryRepository')
const BlockRepository = require('./BlockRepository')
const ProtectRepository = require('./ProtectRepository')

class RepositoryFactory {
    constructor(db) {
        this.pages = new PageRepository(db.pages)
        this.users = new UserRepository(db.users)
        this.permissions = new PermissionRepository(db.perm)
        this.categories = new CategoryRepository(db.category)
        this.history = new HistoryRepository(db.history)
        this.blocks = new BlockRepository(db.block)
        this.protections = new ProtectRepository(db.protect)
    }
}

module.exports = RepositoryFactory
