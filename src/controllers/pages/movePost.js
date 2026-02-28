import i18n from 'i18n'
import { PageNotFoundError, PageExistsError, ValidationError } from '../../services/errors.js'
import renderError from '../../utils/error.js'

export default async (req, res) =>
{
    const { services } = req.app.locals

    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        renderError(req, res, { description: i18n.__('move_nofile'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
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
            renderError(req, res, { description: i18n.__('move_alreadyexists'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        if (error instanceof PageNotFoundError)
        {
            renderError(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        if (error instanceof ValidationError)
        {
            renderError(req, res, { description: i18n.__('illegalaccess'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 400 })
            return
        }
        throw error
    }
}
