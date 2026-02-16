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
            require(paths.resolve('error.js'))(req, res, { description: global.i18n.__('loginneeded'), returnLink: '/login', returnName: global.i18n.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PermissionDeniedError)
        {
            require(paths.resolve('error.js'))(req, res, { description: global.i18n.__('deletepermneeded'), returnLink: '/login', returnName: global.i18n.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, { description: global.i18n.__('page404'), returnLink: '/', returnName: global.i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.resolve('error.js'))(req, res, { description: global.i18n.__('unknown_error'), returnLink: '/', returnName: global.i18n.__('mainpage'), statusCode: 500 })
            return
        }
        throw error
    }
}
