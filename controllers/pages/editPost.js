import i18n from 'i18n'
import { ValidationError } from '../../services/errors.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        await req.app.locals.services.page.editPage({
            title: req.params.name,
            content: req.body.content,
            req,
            editPrefix: req.body.editPrefix || '',
            editSuffix: req.body.editSuffix || '',
            user: req.session.username,
            ipAddress: req.ipAddress,
            comment: req.body.comment
        })
        res.redirect(`/w/${req.params.name}`)
    } catch (error) {
        if (error instanceof ValidationError && error.i18nKey === 'edit_titleneeded') {
            renderError(req, res, {
                description: i18n.__('edit_titleneeded'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 200
            })
            return
        }
        if (error instanceof ValidationError && error.i18nKey === 'pagename_illegalfile') {
            renderError(req, res, {
                description: i18n.__('pagename_illegalfile'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 200
            })
            return
        }
        throw error
    }
}
