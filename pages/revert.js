import i18n from 'i18n'
import { PageNotFoundError, RevisionNotFoundError, ValidationError } from '../services/errors.js'
import renderError from '../utils/error.js'

export default async (req, res) => {
    try {
        const ipAddress = req.ipAddress
        await req.app.locals.services.history.revertPage({
            title: decodeURI(req.params.name),
            revertRev: req.body.rev,
            user: req.session.username,
            ipAddress,
            comment: req.body.comment
        })
        res.redirect('/w/' + decodeURI(req.params.name))
    }
    catch (error) {
        if (error instanceof RevisionNotFoundError) {
            renderError(req, res, { description: i18n.__('revision404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof PageNotFoundError) {
            renderError(req, res, { description: i18n.__('page404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        if (error instanceof ValidationError) {
            renderError(req, res, { description: i18n.__('revision404'), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            return
        }
        throw error
    }
}
