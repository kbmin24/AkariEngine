export default async (req, res) => {
    const threadID = req.body.threadid
    const threadNo = Number(req.body.threadNo)
    const unhide = !!req.body.unhide

    await req.app.locals.services.thread.hideThreadComment({
        threadID,
        threadNo,
        unhide,
        user: req.session.username
    })

    req.app.locals.io?.to(threadID).emit('threadUpdated', {
        type: 'commentVisibilityChanged',
        threadID,
        threadNo,
        isHidden: !unhide
    })

    res.json({ success: true })
}
