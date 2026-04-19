import { ValidationError } from '../../services/errors.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getXrefViewModel({
            title: req.params.name
        })

        await renderTemplateInLayout(req, res, 'pages/xref.ejs', {
            entries: model.entries,
            count: model.count
        }, {
            title: res.__('xrefTo', { page: model.title }),
            username: req.session.username,
            isPage: true,
            pageMode: 'xref',
            pagename: model.title
        })
    } catch (error) {
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
