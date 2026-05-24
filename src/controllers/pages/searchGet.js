import { ValidationError } from '../../services/errors.js'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import sanitizeHTML from 'sanitize-html'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.search.getSearchViewModel({
            query: req.query.q,
            from: req.query.from || 0
        })

        await renderTemplateInLayout(req, res, 'pages/search.ejs', {
            t: res.__,
            sanitizeHTML: (str) => sanitizeHTML(str, { allowedTags: ["em"], allowedAttributes: {}, disallowedTagsMode : 'escape' }),
            searchtitle: model.query,
            resultTitle: model.resultTitle,
            resultContent: model.resultContent,
            searchMode: model.mode,
            from: model.from
        }, {
            title: res.__('searchResults', { q: model.query })
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            res.status(error.statusCode || 400).send(error.message)
            return
        }
        throw error
    }
}
