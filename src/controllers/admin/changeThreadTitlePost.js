export default async (req, res) => {
    await req.app.locals.services.thread.changeThreadTitle({
        threadID: req.body.threadid,
        newTitle: req.body.newtitle,
        user: req.session.username
    })

    res.json({ success: true })
}
