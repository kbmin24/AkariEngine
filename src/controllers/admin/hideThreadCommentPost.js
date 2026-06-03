export default async (req, res) => {
    await req.app.locals.services.thread.hideThreadComment({
        threadID: req.body.threadid,
        threadNo: Number(req.body.threadNo),
        unhide: !!req.body.unhide,
        user: req.session.username
    })

    res.json({ success: true })
}
