import { PageNotFoundError } from '../../services/errors.js'
import { serializeThreadComments } from './serializeThreadComments.js'

export default async (req, res) => {
    const roomId = req.params.name
    const { services } = req.app.locals

    const thread = await services.thread.getThread(roomId)
    if (!thread) throw new PageNotFoundError(roomId)

    const [isAdmin, comments, commentPermission] = await Promise.all([
        services.permission.hasPermission(req.session.username, 'thread'),
        services.thread.getThreadComments(req.session.username, req.ipAddress, roomId),
        services.thread.checkCommentPermission(req.session.username, req.ipAddress, roomId)
    ])

    res.json({
        roomId,
        thread,
        pagename: thread.pagename,
        username: req.session.username || req.ipAddress,
        isAdmin,
        canRead: true,
        commentPermission,
        comments: await serializeThreadComments(comments, services.render, res.__)
    })
}
