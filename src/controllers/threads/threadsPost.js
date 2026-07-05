export default async (req, res) => {
    const threadID = await req.app.locals.services.thread.createThread(
        req.session.username,
        req.ipAddress,
        req.body.title,
        req.params.name,
        req.body.comment
    )

    res.json({ success: true, redirect: '/thread/' + threadID, threadID })
}
