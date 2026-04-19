import {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
} from '../../services/errors.js'
import renderError from '../../utils/error.js'

export default async (req, res) =>
{
    try {
        await req.app.locals.services.page.deletePage({
            title: req.params.name,
            user: req.session.username,
            ipAddress: req.ipAddress,
            comment: req.body.comment
        })

        res.redirect('/')
    } catch (error) {
        if (error instanceof AuthenticationRequiredError)
        {
            renderError(req, res, { description: res.__('loginneeded'), returnLink: '/login', returnName: res.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PermissionDeniedError)
        {
            renderError(req, res, { description: res.__('deletepermneeded'), returnLink: '/login', returnName: res.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            renderError(req, res, { description: res.__('page404'), returnLink: '/', returnName: res.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError)
        {
            renderError(req, res, { description: res.__('unknown_error'), returnLink: '/', returnName: res.__('mainpage'), statusCode: 500 })
            return
        }
        throw error
    }
}
