export default async (req, res) => {
    const threadID = req.body.threadid
    const threadTitle = req.body.newtitle

    await req.app.locals.services.thread.changeThreadTitle({
        threadID,
        newTitle: threadTitle,
        user: req.session.username
    })

    req.app.locals.io?.to(threadID).emit('threadUpdated', {
        type: 'titleChanged',
        threadID,
        threadTitle
    })

    res.json({ success: true })
}
