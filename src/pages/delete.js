const paths = require('../utils/paths')
const {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

module.exports = async (req, res) =>
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
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('loginneeded'), '/login', global.i18n.__('loginpage'), 403, 'ko')
            return
        }
        if (error instanceof PermissionDeniedError)
        {
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('deletepermneeded'), '/login', global.i18n.__('loginpage'), 403, 'ko')
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('page404'), '/', global.i18n.__('mainpage'), 404, 'ko')
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('unknown_error'), '/', global.i18n.__('mainpage'), 500, 'ko')
            return
        }
        throw error
    }
}
