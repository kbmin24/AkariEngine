import { Op } from 'sequelize'
import BaseRepository from './BaseRepository.js'

class FileRepository extends BaseRepository {
    async findByFilename(filename) {
        return this.model.findOne({ where: { filename } })
    }

    async findByFilenameBatch(filenames) {
        return this.model.findAll({ where: { filename: { [Op.in]: filenames } }, attributes: ['filename', 'filenameOnDisk'] })
    }

    async create(filename, filenameOnDisk, uploader, explanation) {
        return this.model.create({
            filename,
            filenameOnDisk,
            uploader,
            explanation
        })
    }
}

export default FileRepository
