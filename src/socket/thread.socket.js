import i18n from 'i18n'
import escapeHTML from '../utils/escapeHTML.js'
import { PermissionDeniedError } from '../services/errors.js'


export default function registerThreadSocketHandlers(socket, context) {
    const { io, services, logger, getIdentity, acknowledge } = context

    socket.on('joinRoom', async (data = {}, callback) => {
        try {
            if (data.notAThread === true) return

            const { username, ipAddress } = getIdentity()
            const threadInfo = await services.thread.getThreadInfo(data.roomId, { user: username, ipAddress })
            if (!threadInfo?.r) throw new PermissionDeniedError('other', null, 'READ permission required.')
            const commentPermission = await services.thread.checkCommentPermission(username, ipAddress, data.roomId)

            socket.join(data.roomId)
            acknowledge(callback, { success: true, thread: threadInfo, commentPermission })
        } catch (err) {
            logger.warn('Socket joinRoom error', { error: err.message })
            acknowledge(callback, { success: false, message: err.message })
        }
    })

    socket.on('leaveRoom', (data = {}, callback) => {
        if (data.notAThread === true) return

        if (typeof data.roomId !== 'string' || !data.roomId) {
            acknowledge(callback, { success: false, message: 'Room ID is required.' })
            return
        }

        socket.leave(data.roomId)
        acknowledge(callback, { success: true })
    })

    socket.on('postThreadComment', async (data = {}, callback) => {
        try {
            const { username, ipAddress } = getIdentity()

            const { hasPermission, i18nKey, i18nParams, reason } = await services.thread.checkCommentPermission(username, ipAddress, data.roomId)
            if (!hasPermission) {
                acknowledge(callback, {
                    success: false,
                    permissionDenied: true,
                    message: reason || 'Permission denied.',
                    i18nKey,
                    i18nParams
                })
                return
            }

            const { comment } = await services.thread.postComment({
                threadID: data.roomId,
                username,
                ipAddress,
                message: data.message
            })

            // TODO per-user language support for socket.io messages
            const content = (await services.render.render(comment.content, i18n.__, {}, false)).html
            const payload = {
                id: comment.id,
                threadID: comment.threadID,
                type: comment.type,
                username: escapeHTML(String(comment.doneBy ?? '')),
                content,
                date: comment.createdAt,
                isHidden: comment.isHidden
            }

            io.sockets.in(data.roomId).emit('threadComment', payload)
            acknowledge(callback, { success: true, comment: payload })
        } catch (err) {
            logger.warn('Socket message rejected', { error: err.message })
            acknowledge(callback, { success: false, message: err.message })
        }
    })
}
