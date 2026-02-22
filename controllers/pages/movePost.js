const i18n = require("i18n")
const paths = require('../../utils/paths')
const {
    PageNotFoundError,
    PageExistsError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

module.exports = async (req, res) =>
{
    const { services } = req.app.locals

    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        require(paths.utils('error'))(req, res, { description: i18n.__('move_nofile'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
        return
    }

    try
    {
        const ipAddress = req.ipAddress
        await services.page.movePage({
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
            require(paths.utils('error'))(req, res, { description: i18n.__('move_alreadyexists'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            require(paths.utils('error'))(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        if (error instanceof ValidationError)
        {
            require(paths.utils('error'))(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        throw error
    }
}
