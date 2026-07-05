import { io } from 'socket.io-client'

let socket = null

export const useSocket = () => {
    if (import.meta.client && !socket) {
        socket = io({
            path: '/socket.io',
            // Nitro's development proxy handles Engine.IO polling requests but
            // does not forward WebSocket upgrade requests. In production, use
            // WebSocket directly to avoid reverse-proxy issues during the
            // polling-to-WebSocket Engine.IO upgrade.
            transports: import.meta.dev ? ['polling'] : ['websocket'],
        })
    }
    return socket
}
