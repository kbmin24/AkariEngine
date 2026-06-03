import { PageNotFoundError } from '../../services/errors.js'

export default async (req, res) => {
    const roomId = req.params.name
    const { services } = req.app.locals

    const thread = await services.thread.getThread(roomId)
    if (!thread) throw new PageNotFoundError(roomId)

    const isAdmin = await services.permission.hasPermission(req.session.username, 'thread')

    res.json({
        roomId,
        thread,
        pagename: thread.pagename,
        username: req.session.username || req.ipAddress,
        isAdmin,
        csrfToken: req.csrfToken()
    })
}
