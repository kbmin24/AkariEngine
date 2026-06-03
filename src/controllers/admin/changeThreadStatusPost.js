export default async (req, res) => {
    await req.app.locals.services.thread.changeThreadStatus({
        threadID: req.body.threadid,
        close: !!req.body.close,
        user: req.session.username
    })

    res.json({ success: true })
}
