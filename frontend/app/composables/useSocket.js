import { io } from 'socket.io-client'

let socket = null

export const useSocket = () => {
    if (import.meta.client && !socket) {
        socket = io({
            path: '/socket.io',
            // Nitro's development proxy handles Engine.IO polling requests but
            // does not forward WebSocket upgrade requests. Production can use
            // the default transports through a WebSocket-aware reverse proxy.
            ...(import.meta.dev ? { transports: ['polling'] } : {}),
        })
    }
    return socket
}
