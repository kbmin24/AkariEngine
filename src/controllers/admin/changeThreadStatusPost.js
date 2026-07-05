export default async (req, res) => {
    const threadID = req.body.threadid
    const close = !!req.body.close

    await req.app.locals.services.thread.changeThreadStatus({
        threadID,
        close,
        user: req.session.username
    })

    req.app.locals.io?.to(threadID).emit('threadUpdated', {
        type: 'statusChanged',
        threadID,
        isOpen: !close
    })

    res.json({ success: true })
}
