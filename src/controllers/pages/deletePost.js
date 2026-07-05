export default async (req, res) => {
    const title = req.params.name
    const user = req.session.username
    const comment = req.body.comment

    await req.app.locals.services.page.deletePage({
        title,
        user,
        ipAddress: req.ipAddress,
        comment
    })

    res.json({ success: true })
}
