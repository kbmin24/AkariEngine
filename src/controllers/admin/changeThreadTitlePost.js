import renderInfo from '../../info.js'
import renderError from '../../utils/error.js'
import { BACK_LINK } from '../../utils/httpHelper.js'
import { AuthenticationRequiredError, PermissionDeniedError, ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        await req.app.locals.services.thread.changeThreadTitle({
            threadID: req.body.threadid,
            newTitle: req.body.newtitle,
            user: req.session.username
        })
        renderInfo(req, res, { description: 'Done.', returnLink: BACK_LINK, returnName: 'the thread' })
    } catch (error) {
        if (error instanceof AuthenticationRequiredError) {
            renderError(req, res, { description: 'Login required.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 401 })
            return
        }
        if (error instanceof PermissionDeniedError) {
            renderError(req, res, { description: 'You do not have thread permission.', returnLink: '/admin', returnName: 'the admin page', statusCode: 403 })
            return
        }
        if (error instanceof ValidationError) {
            renderError(req, res, { description: error.message, returnLink: BACK_LINK, returnName: 'the previous page', statusCode: 400 })
            return
        }
        throw error
    }
}
