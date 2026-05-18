import express from 'express'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { requireLogin } from '../middlewares/permission.js'
import { genCaptcha } from '../utils/captcha.js'
import { createUploadMiddleware } from '../middlewares/upload.js'
import uploadPostController from '../controllers/uploadPostController.js'

const defaultFileTypes = ['jpeg', 'jpg', 'jfif', 'png', 'gif', 'webp', 'svg']

function getFileTypes() {
    if (global.conf.upload_types) return global.conf.upload_types
    return defaultFileTypes
}

export default (_services, _options = {}) => {
    const router = express.Router()
    const fileLimit = (global.conf.upload_maxsize_mb ? global.conf.upload_maxsize_mb : 4)

    const upload = createUploadMiddleware()

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
            title: res.__('upload')
        })
    }))

    router.post('/Upload',
        requireLogin({mode: 'enforce', authReturnLink: '/', authReturnName: 'mainpage'}),
        chkCaptcha,
        upload,
        asyncRoute(uploadPostController)
    )

    return router
}
