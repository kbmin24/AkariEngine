export default async (req, res) => {
    const model = await req.app.locals.services.category.getCategoryViewModel(req.params.name, {
        from: req.query.from,
        to: req.query.to
    })

    res.json({
        category: model.category,
        pages: model.pages,
        from: model.from,
        to: model.to,
        pageCount: model.pageCount,
        pgSize: model.pgSize
    })
}
