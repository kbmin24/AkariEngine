const paths = require('../utils/paths')
const i18n = require("i18n")
const {
    PageNotFoundError,
    RevisionNotFoundError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

module.exports = async (req, res, perm) =>
{
    try
    {
        const ipAddress = req.ipAddress
        await req.app.locals.services.page.revertPage({
            title: decodeURI(req.params.name),
            revertRev: req.body.rev,
            user: req.session.username,
            ipAddress,
            comment: req.body.comment
        })
        res.redirect('/w/' + decodeURI(req.params.name))
    }
    catch (error)
    {
        if (error instanceof RevisionNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('revision404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('page404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('revision404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        throw error
    }
}
