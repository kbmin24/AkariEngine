import crypto from 'crypto'
import multer from 'multer'
import paths from '../utils/paths.js'
import mime from 'mime'
import { ValidationError } from '../services/errors.js'

const defaultFileTypes = ['jpeg', 'jpg', 'jfif', 'png', 'gif', 'webp', 'svg']

function getMimeTypes() {
  return global.conf.upload_mimes ?? global.conf.upload_types ?? defaultFileTypes
}

const storage = multer.diskStorage({
  destination: paths.uploads,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + '.' + mime.getExtension(file.mimetype)),
})

function fileFilter(_req, file, cb) {
  const mime = file.mimetype.split('/').pop().toLowerCase()
  if (getMimeTypes().includes(mime)) return cb(null, true)
  cb(new ValidationError({
    i18nKey: 'invalidFileType',
    defaultMessage: `Unsupported file type.`,
  }))
}

export function createUploadMiddleware() {
  const fileLimit = global.conf.upload_maxsize_mb ?? 4
  return multer({
    storage,
    fileFilter,
    limits: {
      fields: 3,
      fieldNameSize: 255,
      fileSize: fileLimit * 1024 * 1024,
    },
  }).single('inputFile')
}