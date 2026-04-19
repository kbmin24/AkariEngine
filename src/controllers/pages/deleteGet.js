import { PageNotFoundError } from '../../services/errors.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getDeleteViewModel({
            title: req.params.name,
            username: req.session.username
        })

        await renderTemplateInLayout(req, res, 'pages/delete.ejs', {
            title: model.title,
            l: res.__,
            username: model.username,
            csrfToken: req.csrfToken()
        }, {
            title: res.__('deletepg', { name: req.params.name }),
            isPage: true,
            pageMode: 'delete',
            pagename: model.pagename
        })
    } catch (error) {
        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
                description: `${res.__('page404')} <a href="/edit/${req.params.name}">${res.__('page_asknew')}</a>`,
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 404
            })
            return
        }
        throw error
    }
}
