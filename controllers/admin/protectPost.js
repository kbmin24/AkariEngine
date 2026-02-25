import i18n from 'i18n'
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
                description: i18n.__('loginneeded'),
                returnLink: '/login',
                returnName: i18n.__('loginpage'),
                statusCode: 403
            })
            return
        }

        if (error instanceof PermissionDeniedError) {
            renderError(req, res, {
                description: i18n.__('ACLpermRequried'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 403
            })
            return
        }

        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
                description: i18n.__('page404'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 404
            })
            return
        }

        if (error instanceof ValidationError) {
            renderError(req, res, {
                description: error.message,
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: error.statusCode || 400
            })
            return
        }

        throw error
    }
}
