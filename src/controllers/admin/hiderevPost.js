export default async (req, res) => {
    await req.app.locals.services.admin.hideRevision({
        title: req.body.pagename,
        revision: Number(req.body.rev),
        level: req.body.level,
        actor: req.session.username
    })

    res.json({ success: true })
}
