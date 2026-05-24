import date from 'date-and-time'
import { PageNotFoundError, ValidationError } from '../../services/errors.js'
import renderError from '../../utils/error.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.history.getHistoryViewModel({
            title: req.params.name,
            from: req.query.from,
            to: req.query.to,
            user: req.session.username,
            ipAddress: req.ipAddress
        })

        await renderTemplateInLayout(req, res, 'pages/histories.ejs', {
            l: res.__,
            changes: model.changes,
            from: model.from,
            to: model.to,
            historycount: model.historyCount,
            title: model.title,
            pgSize: model.pgSize,
            date
        }, {
            title: res.__('historyOf', { p: req.params.name }),
            username: req.session.username,
            ipaddr: req.ipAddress,
            isPage: true,
            pageMode: 'history',
            pagename: req.params.name,
        })
    } catch (error) {
        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
                description: res.__('noPageMsg', { name: req.params.name }),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 404
            })
            return
        }

        if (error instanceof ValidationError && error.i18nKey) {
            renderError(req, res, {
                description: res.__(error.i18nKey),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: error.statusCode || 400
            })
            return
        }

        throw error
    }
}
