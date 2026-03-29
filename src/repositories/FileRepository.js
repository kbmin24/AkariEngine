import BaseRepository from './BaseRepository.js'

class FileRepository extends BaseRepository {
    async findByFilename(filename) {
        return this.model.findOne({ where: { filename } })
    }

    async findByFilenameBatch(filenames) {
        return this.findByFieldBatch('filename', filenames)
    }
}

export default FileRepository
