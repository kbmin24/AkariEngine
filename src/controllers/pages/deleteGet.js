export default async (req, res) => {
    const model = await req.app.locals.services.page.getDeleteViewModel({
        title: req.params.name,
        username: req.session.username
    })

    res.json({
        title: model.title,
        pagename: model.pagename,
        username: model.username,
        csrfToken: req.csrfToken()
    })
}
