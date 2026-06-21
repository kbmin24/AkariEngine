import { serializeThreadComments } from '../threads/serializeThreadComments.js'

export default async (req, res) => {
    const query = req.query ? req.query.q : undefined
    const comments = await req.app.locals.services.thread.getThreadComments(
        req.session.username,
        req.ipAddress,
        query
    )

    if (!comments) {
        res.json({})
        return
    }

    res.json(await serializeThreadComments(comments, req.app.locals.services.render))
}
