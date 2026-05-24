import { AuthenticationRequiredError, PermissionDeniedError, PageNotFoundError, ValidationError } from '../../services/errors.js'
import renderError from '../../utils/error.js'

export default async (req, res) =>
{
    try {
        await req.app.locals.services.page.protectPage({
            title: req.params.name,
            rules: req.body,
            user: req.session.username
        })

        res.redirect(`/w/${req.params.name}`)
    } catch (error) {
        if (error instanceof AuthenticationRequiredError) {
            renderError(req, res, {
                description: res.__('loginneeded'),
                returnLink: '/login',
                returnName: res.__('loginpage'),
                statusCode: 403
            })
            return
        }

        if (error instanceof PermissionDeniedError) {
            renderError(req, res, {
                description: res.__('ACLpermRequried'),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 403
            })
            return
        }

        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
                description: res.__('page404'),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 404
            })
            return
        }

        if (error instanceof ValidationError) {
            renderError(req, res, {
                description: error.message,
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: error.statusCode || 400
            })
            return
        }

        throw error
    }
}
