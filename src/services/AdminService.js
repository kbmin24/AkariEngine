import logger from '../utils/logger.js'
import { AuthenticationRequiredError, PermissionDeniedError, PageNotFoundError, ValidationError } from './errors.js'

class AdminService {
    constructor(adminlogRepository, permissionRepository, pageRepository, protectRepository, userRepository) {
        this.adminlogRepository = adminlogRepository
        this.permissionRepository = permissionRepository
        this.pageRepository = pageRepository
        this.protectRepository = protectRepository
        this.userRepository = userRepository
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
            throw new ValidationError({ message: 'No such revision.', i18nKey: 'admin_hiderev_norev' })
        }
        if (page.currentRev === revision) {
            throw new ValidationError({ message: 'Cannot hide the current revision.', i18nKey: 'admin_hiderev_currentrev' })
        }

        const existingRules = await this.protectRepository.findAllByTitleAndRevision(title, revision)
        if (existingRules.length > 0) {
            throw new ValidationError({ message: 'A rule for this revision already exists.', i18nKey: 'admin_hiderev_exists' })
        }

        await this.protectRepository.setRevisionProtection(title, revision, level)
        await this.adminlogRepository.insertLog(actor, `protected ${title} r${revision} to ${level}`)
    }

    async unhideRevision({ title, revision, actor }) {
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

        await this.protectRepository.deleteRevisionProtection(title, revision)
        await this.adminlogRepository.insertLog(actor, `removed revision protection from ${title} r${revision}`)
    }

    async grantPermissions({ actor, grantTo, permissions }) {
        if (!actor) throw new AuthenticationRequiredError()
        if (!grantTo) throw new ValidationError('Please specify username to grant to.')

        const hasPermission = await this.permissionRepository.hasPermission(actor, 'grant')
        if (!hasPermission) {
            throw new PermissionDeniedError('grant', null, { message: 'You do not have grant permission.' })
        }

        const user = await this.userRepository.findByUsername(grantTo)
        if (!user) throw new ValidationError('No such user.')

        await this.permissionRepository.revokeAllPermissions(grantTo)
        await Promise.all(permissions.map(perm => this.permissionRepository.grantPermission(grantTo, perm, actor)))

        const permsStr = permissions.length ? permissions.join(' ') : '(none)'
        await this.adminlogRepository.insertLog(actor, `granted to ${grantTo}: ${permsStr}`)
        logger.admin('Permissions granted', actor, { grantTo, permissions: permsStr })
    }
}

export default AdminService
