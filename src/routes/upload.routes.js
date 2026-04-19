import express from 'express'
import multer from 'multer'
import fs from 'fs'
import paths from '../utils/paths.js'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { requireLogin } from '../middlewares/permission.js'
import { genCaptcha } from '../utils/captcha.js'

const defaultFileTypes = ['jpeg', 'jpg', 'jfif', 'png', 'gif', 'webp', 'svg']

function getFileTypes() {
    if (global.conf.upload_types) return global.conf.upload_types
    return defaultFileTypes
}

function getMimeTypes() {
    if (global.conf.upload_mimes) return global.conf.upload_mimes
    return getFileTypes()
}

function checkFileType(file, cb) {
    const ext = getFileTypes().includes(file.originalname.split(/\./).pop().toLowerCase())
    const mime = getMimeTypes().includes(file.mimetype.split(/\//).pop().toLowerCase())
    if (mime && ext) return cb(null, true)
    cb(`You can only upload ${getFileTypes().join(', ')}.`)
}

export default (_services, _options = {}) => {
    const router = express.Router()
    const fileLimit = (global.conf.upload_maxsize_mb ? global.conf.upload_maxsize_mb : 4)

    const storage = multer.diskStorage({
        destination: (req, file, cb) => { cb(null, paths.resolve('public', 'uploads')) },
        filename: (req, file, cb) => {
            if (req.body.filename == '') {
                const e = new Error('File name is null')
                e.code = 'FILENAMENULL'
                return cb(e)
            }

            try {
                if (fs.existsSync(paths.resolve('public', 'uploads', req.body.filename))) {
                    const e = new Error('파일이 이미 존재합니다.')
                    e.code = 'FILEEXISTS'
                    return cb(e)
                }
                cb(null, req.body.filename.trim())
            } catch (_err) {
                cb('Internal Server Error')
            }
        }
    })

    const upload = multer({
        storage,
        limits: {
            fields: 3,
            fieldNameSize: 255,
            fileSize: fileLimit * 1024 * 1024
        },
        fileFilter: async (req, file, cb) => {
            // TODO it doens't make sense that this logic is even here...

            const ext = req.body.filename.split(/\./).pop().toLowerCase()
            if (!(getFileTypes().includes(ext))) {
                return cb(`You can only upload ${getFileTypes().join(', ')}.`)
            }
            if (!req.body.filename.match(/^[^#?\\/<>:*|"]*$/i)) {
                return cb('File name cannot contain any of the following characters: #, ?, /, \\, <, >, :, *, |, ".')
            }

            checkFileType(file, cb)
        }
    })

    router.get('/Upload',
        requireLogin({mode: 'enforce', authReturnLink: '/', authReturnName: 'mainpage'}),
        asyncRoute(async (req, res) => {
        const username = req.session.username
        const captchaSVG = await genCaptcha()
        await renderTemplateInLayout(req, res, 'files/upload.ejs', {
            username,
            captcha: captchaSVG,
            filetypes: getFileTypes().join(', '),
            fileLimit
        }, {
            title: res.__('upload'),
            username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/Upload',
        requireLogin({mode: 'enforce', authReturnLink: '/', authReturnName: 'mainpage'}),
        chkCaptcha,
        upload.single('inputFile'),
        asyncRoute(async (req, res) => {
        const filepgname = 'File:' + req.body.filename

        await global.db.mfile.create({
            filename: req.body.filename,
            uploader: req.session.username,
            explanation: req.body.explanation
        })
        await global.db.pages.create({
            title: filepgname,
            content: req.body.explanation,
            currentRev: 1
        })

        const categoryRegex = /\[\[(?:Category|분류):(.*?)\]\]/igm
        let e
        while ((e = categoryRegex.exec(req.body.explanation)) !== null) {
            if (!e[1]) continue
            global.db.category.create({
                page: filepgname,
                category: e[1]
            })
        }

        await global.db.history.create({
            page: filepgname,
            rev: 1,
            content: req.body.explanation,
            bytechange: req.body.explanation.length,
            editedby: req.session.username,
            comment: `${req.body.filename} 업로드`,
            type: 'edit'
        })
        await global.db.recentchanges.create({
            page: filepgname,
            rev: 1,
            doneBy: req.session.username,
            comment: `${req.body.filename} 업로드`,
            bytechange: req.body.explanation.length,
            type: 'upload'
        })
        res.redirect('/w/' + filepgname)
    }))

    return router
}
