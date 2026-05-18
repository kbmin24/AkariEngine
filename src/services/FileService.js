import { ValidationError } from "./errors.js"
class FileService {
    constructor(pageService, permissionService, fileRepository) {
        this.pageService = pageService
        this.permissionService = permissionService
        this.fileRepository = fileRepository
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
}

export default FileService