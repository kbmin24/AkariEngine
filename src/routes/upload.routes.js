const express = require('express')
const multer = require('multer')
const fs = require('fs')
const axios = require('axios')
const dateandtime = require('date-and-time')
const paths = require('../utils/paths')

const router = express.Router()
const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const ejs = require('ejs')
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    load('view.js')(req, res, {
        ...layoutData,
        content: html
    })
}

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
    cb(`${getFileTypes().join(', ')}만 업로드 할 수 있습니다.`)
}

module.exports = (_services, _options = {}) => {
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
            const username = req.session.username
            if (username === undefined) {
                const e = new Error(global.i18n.__('loginneeded'))
                e.code = 'UPLOAD_LOGINNEEDED'
                return cb(e)
            }

            const b = await global.db.block.findOne({ where: { target: username, targetType: 'user' } })
            if (b) {
                const e = new Error(
                    b.isForever
                        ? `${b.doneBy}에 의해 영구적으로 차단된 상태입니다. (사유: ${b.comment})`
                        : `${b.doneBy}에 의해 ${dateandtime.format(b.until, global.dtFormat)}까지 차단된 상태입니다. (사유: ${b.comment})`
                )
                e.code = 'UPLOAD_BLOCKED'
                return cb(e)
            }

            const hasBypass = await global.db.perm.findOne({ where: { perm: 'bypasscaptcha', username: req.session.username } })
            if (!hasBypass) {
                const resKey = req.body['g-recaptcha-response']
                const url = `https://www.google.com/recaptcha/api/siteverify?secret=${global.conf.reCAPTCHA_prv}&response=${resKey}`
                try {
                    const verRes = await axios.post(url)
                    const data = verRes.data || {}
                    if (data.success !== true) {
                        const e = new Error('캡챠 오류')
                        e.code = 'INVALIDCAPTCHA'
                        return cb(e)
                    }
                } catch (_err) {
                    const e = new Error('캡챠 오류')
                    e.code = 'INVALIDCAPTCHA'
                    return cb(e)
                }
            }

            const ext = req.body.filename.split(/\./).pop().toLowerCase()
            if (!(getFileTypes().includes(ext))) {
                return cb(`${getFileTypes().join(', ')}만 업로드할 수 있습니다.`)
            }
            if (!req.body.filename.match(/^[^\#\?\\\/\<\>\:\*\|"]*$/i)) {
                return cb('파일명은 다음 문자를 포함할 수 없습니다: #, ?, /, \\, &lt;, &gt;, :, *, |, ".')
            }

            checkFileType(file, cb)
        }
    })

    router.get('/Upload', asyncRoute(async (req, res) => {
        const username = req.session.username
        const captchaSVG = await load('utils', 'captcha.js').genCaptcha(req)
        await renderTemplateInLayout(req, res, 'files/upload.ejs', {
            username,
            captcha: captchaSVG,
            filetypes: getFileTypes().join(', '),
            fileLimit
        }, {
            title: global.i18n.__('upload'),
            username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/Upload', upload.single('inputFile'), asyncRoute(async (req, res) => {
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
