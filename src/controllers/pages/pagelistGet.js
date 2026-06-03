export default async (req, res) => {
    const model = await req.app.locals.services.page.getPageListViewModel({
        page: req.query.page * 1 || 1
    })

    res.json({
        pages: model.pages,
        count: model.count,
        currentPage: model.currentPage
    })
}
