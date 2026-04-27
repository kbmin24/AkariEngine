import renderInfo from '../../info.js'
import renderError from '../../utils/error.js'
import { BACK_LINK } from '../../utils/httpHelper.js'
import { AuthenticationRequiredError, PermissionDeniedError, PageNotFoundError, ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        await req.app.locals.services.admin.hideRevision({
            title: req.body.pagename,
            revision: Number(req.body.rev),
            level: req.body.level,
            actor: req.session.username
        })
        renderInfo(req, res, null, res.__('done'), '/admin', 'the admin page')
    } catch (error) {
        // fallback because we have middleware too
        if (error instanceof AuthenticationRequiredError) {
            renderError(req, res, { description: 'Login required.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 401 })
            return
        }
        if (error instanceof PermissionDeniedError) {
            renderError(req, res, { description: 'You need ACL permission.', returnLink: '/admin', returnName: 'the admin page', statusCode: 403 })
            return
        }
        if (error instanceof PageNotFoundError) {
            renderError(req, res, { description: 'No such page.', returnLink: BACK_LINK, returnName: 'the previous page', statusCode: 404 })
            return
        }
        if (error instanceof ValidationError) {
            renderError(req, res, { description: error.message, returnLink: BACK_LINK, returnName: 'the previous page', statusCode: 400 })
            return
        }
        throw error
    }
}
