import { io } from 'socket.io-client'

let socket = null

export const useSocket = () => {
    if (import.meta.client && !socket) {
        socket = io({ path: '/socket.io' })
    }
    return socket
}
