import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const model = await req.app.locals.services.category.getCategoryViewModel(req.params.name)

    await renderTemplateInLayout(req, res, 'pages/category.ejs', {
        category: model.pages
    }, {
        title: '분류 ' + model.category
    })
}
