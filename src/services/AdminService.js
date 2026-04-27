import { AuthenticationRequiredError, PermissionDeniedError, PageNotFoundError, ValidationError } from './errors.js'

class AdminService {
    constructor(adminlogRepository, permissionRepository, pageRepository, protectRepository) {
        this.adminlogRepository = adminlogRepository
        this.permissionRepository = permissionRepository
        this.pageRepository = pageRepository
        this.protectRepository = protectRepository
    }

    async getAdminLogAndCount({ doneBy, job, from }) {
        return await this.adminlogRepository.findLogsAndCount({ doneBy, job, offset: from })
    }

    async insertAdminLog(doneBy, description) {
        await this.adminlogRepository.insertLog(doneBy, description)
    }

    async hideRevision({ title, revision, level, actor }) {
        if (!actor) {
            throw new AuthenticationRequiredError()
        }

        if (!Number.isFinite(revision) || revision < 1) {
            throw new ValidationError({ message: 'rev must be a valid positive number.' })
        }

        const hasPermission = await this.permissionRepository.hasPermission(actor, 'acl')
        if (!hasPermission) {
            throw new PermissionDeniedError('acl', null, { message: 'You need ACL permission.' })
        }

        const page = await this.pageRepository.findByTitle(title)
        if (!page) {
            throw new PageNotFoundError(title)
        }

        if (page.currentRev < revision) {
            throw new ValidationError({ message: 'No such revision.' })
        }

        await this.protectRepository.setRevisionProtection(title, revision, level)
        await this.adminlogRepository.insertLog(actor, `protected ${title} r${revision} to ${level}`)
    }
}

export default AdminService
