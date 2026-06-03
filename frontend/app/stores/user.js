import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: null,
        isAdmin: false,
        ipAddress: null,
        permissions: [],
        skin: null,
    }),
    getters: {
        isLoggedIn: (state) => !!state.username,
    },
    actions: {
        setUser({ username, isAdmin, ipAddress, permissions, skin }) {
            this.username = username
            this.isAdmin = isAdmin
            this.ipAddress = ipAddress
            this.permissions = permissions ?? []
            this.skin = skin ?? null
        },
        clearUser() {
            this.username = null
            this.isAdmin = false
            this.ipAddress = null
            this.permissions = []
            this.skin = null
        },
    },
})
