import { Server } from 'socket.io'
import expressSocketIoSession from 'express-socket.io-session'

import { normalizeIpAddress } from '../utils/ipTools.js'
import registerDeveloperConsoleSocketHandlers from './developerConsole.socket.js'
import registerThreadSocketHandlers from './thread.socket.js'


export default function registerSocketServer(options) {
    const { server, app, sessionMiddleware, services, logger } = options
    const io = new Server(server)

    app.locals.io = io
    io.use(expressSocketIoSession(sessionMiddleware, { autoSave: true }))

    io.on('connection', socket => {
        const getIdentity = () => ({
            username: socket.handshake.session.username,
            ipAddress: normalizeIpAddress(socket.handshake.address)
        })

        const acknowledge = (callback, result) => {
            if (typeof callback === 'function') callback(result)
        }

        const context = {
            io,
            services,
            logger,
            getIdentity,
            acknowledge
        }

        registerDeveloperConsoleSocketHandlers(socket, context)
        registerThreadSocketHandlers(socket, context)
    })

    return io
}
