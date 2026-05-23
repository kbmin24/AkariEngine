import {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
} from '../../services/errors.js'
import renderError from '../../utils/error.js'
import renderInfo from '../../info.js'

export default async (req, res) => {
    try {
        const title = req.params.name
        const user = req.session.username
        const comment = req.body.comment

        if (title.toLowerCase().startsWith('file:')) {
            const m = /^File:(.*)$/i.exec(title)
            const filename = m && m[1] ? m[1] : ''
            await req.app.locals.services.file.deleteFile({ filename, user, comment })
        }
        else {
            await req.app.locals.services.page.deletePage({ title, user, comment })
        }

        renderInfo(req, res, {
            description: res.__('done'),
            returnLink: '/',
            returnName: res.__('mainpage')
        })
        
    } catch (error) {
        if (error instanceof AuthenticationRequiredError) {
            renderError(req, res, { description: res.__('loginneeded'), returnLink: '/login', returnName: res.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PermissionDeniedError) {
            renderError(req, res, { description: res.__('deletepermneeded'), returnLink: '/login', returnName: res.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PageNotFoundError) {
            renderError(req, res, { description: res.__('page404'), returnLink: '/', returnName: res.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError) {
            renderError(req, res, { description: res.__('unknown_error'), returnLink: '/', returnName: res.__('mainpage'), statusCode: 500 })
            return
        }
        throw error
    }
}
