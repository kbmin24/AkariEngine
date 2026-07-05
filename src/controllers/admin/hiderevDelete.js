export default async (req, res) => {
    await req.app.locals.services.admin.unhideRevision({
        title: req.body.pagename,
        revision: Number(req.body.rev),
        actor: req.session.username
    })

    res.json({ success: true })
}
