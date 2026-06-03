export default async (req, res) => {
    const model = await req.app.locals.services.history.getDiffViewModel({
        title: req.params.name,
        rev1: req.query.rev1,
        rev2: req.query.rev2,
        user: req.session.username,
        ipAddress: req.ipAddress
    })

    res.json({
        pagename: model.pagename,
        rev1: model.rev1,
        rev2: model.rev2,
        diffHtml: model.diffHtml
    })
}
