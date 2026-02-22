const i18n = require("i18n")
const {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError
} = require('../services/errors.js')

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
            require('../utils/error.js')(req, res, { description: i18n.__('loginneeded'), returnLink: '/login', returnName: i18n.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PermissionDeniedError)
        {
            require('../utils/error.js')(req, res, { description: i18n.__('deletepermneeded'), returnLink: '/login', returnName: i18n.__('loginpage'), statusCode: 403 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require('../utils/error.js')(req, res, { description: i18n.__('page404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError)
        {
            require('../utils/error.js')(req, res, { description: i18n.__('unknown_error'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 500 })
            return
        }
        throw error
    }
}
