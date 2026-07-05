export default async (req, res) => {
    await req.app.locals.services.history.revertPage({
        title: decodeURI(req.params.name),
        revertRev: req.body.rev,
        user: req.session.username,
        ipAddress: req.ipAddress,
        comment: req.body.comment
    })

    res.json({ success: true, redirect: '/w/' + decodeURI(req.params.name) })
}
