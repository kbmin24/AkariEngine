import renderInfo from '../../info.js'
import renderError from '../../utils/error.js'
import { AuthenticationRequiredError, PermissionDeniedError, ValidationError } from '../../services/errors.js'

const RESERVED_FIELDS = new Set(['grantTo', '_csrf'])

export default async (req, res) => {
    const permissions = Object.keys(req.body).filter(k => !RESERVED_FIELDS.has(k))

    try {
        await req.app.locals.services.admin.grantPermissions({
            actor: req.session.username,
            grantTo: req.body.grantTo,
            permissions
        })
        renderInfo(req, res, { description: res.__('done'), returnLink: '/admin', returnName: res.__('adminpage') })
    } catch (error) {
        // fallbacks, mostly covered by middlewares
        if (error instanceof AuthenticationRequiredError) {
            renderError(req, res, { description: res.__('loginneeded'), returnLink: '/login', returnName: '로그인 페이지', statusCode: 401 })
            return
        }
        if (error instanceof PermissionDeniedError) {
            renderError(req, res, { description: 'You do not have grant permission.', returnLink: '/admin', returnName: 'the admin page', statusCode: 403 })
            return
        }
        if (error instanceof ValidationError) {
            renderError(req, res, { description: error.message, returnLink: '/admin/grant', returnName: 'the grant page', statusCode: 400 })
            return
        }
        throw error
    }
}
