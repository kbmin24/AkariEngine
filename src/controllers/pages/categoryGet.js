export default async (req, res) => {
    const model = await req.app.locals.services.category.getCategoryViewModel(req.params.name)

    res.json({
        category: model.category,
        pages: model.pages
    })
}
