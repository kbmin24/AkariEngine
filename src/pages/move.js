const { CaptchaError } = require('../services/errors')
const i18n = require("i18n")
const paths = require('../utils/paths')
const {
    PageNotFoundError,
    PageExistsError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

// todo: refactor this
module.exports = async (req, res) =>
{
    const { repositories, services } = req.app.locals
    const { protections, permissions, blocks } = repositories

    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        require(paths.resolve('error.js'))(req, res, { description: i18n.__('move_nofile'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 200 })
        return
    }

    try
    {
        const ipAddress = req.ipAddress
        await req.app.locals.services.page.movePage({
            oldTitle: req.params.name,
            newTitle: req.body.newName,
            user: req.session.username,
            ipAddress
        })
        res.redirect('/w/' + req.body.newName)
    }
    catch (error)
    {
        if (error instanceof PageExistsError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('move_alreadyexists'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 200 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 200 })
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.resolve('error.js'))(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 200 })
            return
        }
        throw error
    }
}
