import { io } from 'socket.io-client'

let socket = null

export const useSocket = () => {
    if (import.meta.client && !socket) {
        socket = io({
            path: '/socket.io',
            // Avoid the polling-to-WebSocket Engine.IO upgrade path. Reverse
            // proxies can reject follow-up polling requests when the Engine.IO
            // session id is not handled consistently.
            transports: ['websocket'],
        })
    }
    return socket
}
