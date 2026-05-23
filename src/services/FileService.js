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

    async deleteFile({ filename, user, comment }) {
        if (!filename) throw new ValidationError('Filename is required')
        if (!user) throw new AuthenticationRequiredError()
        const file = await this.fileRepository.findByFilename(filename)
        if (!file) throw new ValidationError('File not found')
        await this.permissionService.requirePermission(user, 'deletefile')

        // Because we are deleting file: page too
        await this.permissionService.requirePermission(user, 'deletepage')

        const uploadPath = paths.upload(file.filenameOnDisk)
        if (fs.existsSync(uploadPath)) {
            fs.unlinkSync(uploadPath)
        }

        await this.pageRepository.deletePageWithHistory({
            title: `File:${filename}`,
            doneBy: user,
            comment,
            filename
        })

        logger.admin('File deleted', user, { filename })
    }
}

export default FileService