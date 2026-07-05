export default async (req, res) => {
    await req.app.locals.services.page.protectPage({
        title: req.params.name,
        rules: req.body,
        user: req.session.username
    })

    res.json({ success: true })
}
