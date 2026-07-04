export const useAuth = () => {
    const store = useUserStore()

    const fetchMe = async () => {
        try {
            const data = await $fetch('/api/me', {
                headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
            })
            store.setUser(data)
            return data
        } catch {
            store.clearUser()
            return null
        }
    }

    return { store, fetchMe }
}
