import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const model = await req.app.locals.services.page.getPageListViewModel({
        page: req.query.page * 1 || 1
    })

    await renderTemplateInLayout(req, res, 'pages/pagelist.ejs', {
        pages: model.pages,
        count: model.count,
        currentPage: model.currentPage
    }, {
        title: '문서 목록'
    })
}
