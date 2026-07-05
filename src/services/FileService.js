import fs from 'fs'

import {
    ValidationError,
    AuthenticationRequiredError
} from "./errors.js"
import paths from "../utils/paths.js"
import logger from '../utils/logger.js'

class FileService {
    constructor(pageService, permissionService, fileRepository, pageRepository) {
        this.pageService = pageService
        this.permissionService = permissionService
        this.fileRepository = fileRepository
        this.pageRepository = pageRepository
    }

    defaultFileTypes = ['jpeg', 'jpg', 'jfif', 'png', 'gif', 'webp', 'svg']

    getFileTypes() {
        if (global.conf.upload_types) return global.conf.upload_types
        return this.defaultFileTypes
    }

    async uploadPostProcess({ filename, filePageName, filenameOnDisk, fileExplanation, username, ipAddress }) {
        // check LOGIN permission
        await this.permissionService.requireLoginAccess(username, {
            ipAddress
        })

        const changeDescription = `Uploaded ${filename}`

        if (!global.legalFilenameRegex.test(filename)) {
            throw new ValidationError({
                i18nKey: 'illegalFilename',
                defaultMessage: 'Filename contains illegal characters.',
            })
        }

        if (!this.getFileTypes().includes(filename.split('.').pop().toLowerCase())) {
            throw new ValidationError({
                i18nKey: 'invalidFileType',
                defaultMessage: 'Unsupported file type.',
            })
        }

        await this.fileRepository.create(filename, filenameOnDisk, username, fileExplanation)
        await this.pageService.editPage({
            title: filePageName,
            content: fileExplanation,
            user: username,
            comment: changeDescription,
            type: 'upload',
            ipAddress,
            iscreatingFile: true
        })
    }

    async purgeFile({ filename, user, comment }) {
        if (!filename) throw new ValidationError('Filename is required')
        if (!user) throw new AuthenticationRequiredError()
        await this.permissionService.requirePermission(user, 'purgepage')

        const result = await this.pageRepository.purgePage({
            title: `File:${filename}`,
            doneBy: user,
            comment
        })

        if (!result.purged) throw new ValidationError('File not found')

        const filenameOnDisk = result.file ? result.file.filenameOnDisk : null
        if (filenameOnDisk) {
            const uploadPath = paths.upload(filenameOnDisk)
            if (fs.existsSync(uploadPath)) {
                fs.unlinkSync(uploadPath)
            }
        }

        logger.admin('File purged', user, { filename })
    }

    async deleteFile({ filename, user, comment }) {
        return this.purgeFile({ filename, user, comment })
    }
}

export default FileService
