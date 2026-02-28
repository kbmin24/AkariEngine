import i18n from 'i18n'
import { RevisionNotFoundError, ValidationError } from '../../services/errors.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.history.getDiffViewModel({
            title: req.params.name,
            rev1: req.query.rev1,
            rev2: req.query.rev2,
            user: req.session.username,
            ipAddress: req.ipAddress
        })

        await renderTemplateInLayout(req, res, 'pages/diff.ejs', {
            diffHtml: model.diffHtml
        }, {
            title: i18n.__('diffTitle', {
                pagename: req.params.name,
                rev1: model.rev1,
                rev2: model.rev2
            }),
            isPage: true,
            pagename: model.pagename,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            renderError(req, res, {
                description: error.message,
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: error.statusCode || 404
            })
            return
        }

        if (error instanceof RevisionNotFoundError) {
            renderError(req, res, {
                description: i18n.__('revision404'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 404
            })
            return
        }

        throw error
    }
}
