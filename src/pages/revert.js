const paths = require('../utils/paths')
const {
    PageNotFoundError,
    RevisionNotFoundError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

module.exports = async (req, res, perm) =>
{
    // TODO change this into middleware
    if (!(await require(paths.resolve('tools', 'captcha.js')).chkCaptcha(req, res, perm))) return

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
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('revision404'), '/', global.i18n.__('mainpage'), 404, 'ko')
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('page404'), '/', global.i18n.__('mainpage'), 404, 'ko')
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('revision404'), '/', global.i18n.__('mainpage'), 404, 'ko')
            return
        }
        throw error
    }
}
