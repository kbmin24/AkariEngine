import adminCommand from '../admin/command.js'
import { PermissionDeniedError } from '../services/errors.js'


const DEVELOPER_CONSOLE_ROOM = 'developerconsole'
const DEVELOPER_CONSOLE_GREETING = 'OK!\nAkariEngine 4.1\nCopyright Kyubin Min 2021-2026. Distributed under GNU AGPL 3.\n\nType \'help\' for the list of commands.\n'


export default function registerDeveloperConsoleSocketHandlers(socket, context) {
    const { services, logger, acknowledge } = context

    socket.on('joinRoom', async (data = {}, callback) => {
        try {
            if (data.notAThread !== true || data.roomId !== DEVELOPER_CONSOLE_ROOM) return

            const username = socket.handshake.session.username
            if (await services.permission.hasPermission(username, 'developer')) {
                socket.join(DEVELOPER_CONSOLE_ROOM)
                socket.emit('joinok')
                socket.emit('output', DEVELOPER_CONSOLE_GREETING)
                acknowledge(callback, { success: true })
                return
            }

            throw new PermissionDeniedError('other', null, 'Developer permission required.')
        } catch (err) {
            logger.warn('Socket developer console joinRoom error', { error: err.message })
            acknowledge(callback, { success: false, message: err.message })
        }
    })

    socket.on('leaveRoom', (data = {}, callback) => {
        if (data.notAThread !== true || data.roomId !== DEVELOPER_CONSOLE_ROOM) return

        socket.leave(DEVELOPER_CONSOLE_ROOM)
        acknowledge(callback, { success: true })
    })

    socket.on('input', async data => {
        await adminCommand(socket, data.command)
    })
}
