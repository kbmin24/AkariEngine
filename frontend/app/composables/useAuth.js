export const useAuth = () => {
    const store = useUserStore()

    const fetchMe = async () => {
        try {
            const data = await $fetch('/api/me')
            store.setUser(data)
        } catch {
            store.clearUser()
        }
    }

    return { store, fetchMe }
}
