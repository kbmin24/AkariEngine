import i18n from 'i18n'
import { ValidationError } from '../../services/errors.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getSearchViewModel({
            query: req.query.q,
            from: req.query.from || 0
        })

        await renderTemplateInLayout(req, res, 'pages/search.ejs', {
            searchtitle: model.query,
            resultTitle: model.resultTitle,
            resultContent: model.resultContent,
            from: model.from
        }, {
            title: i18n.__('searchResults', { q: model.query })
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            res.status(error.statusCode || 400).send(error.message)
            return
        }
        throw error
    }
}
