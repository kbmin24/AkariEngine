export const useAuth = () => {
    const store = useUserStore()
    const akariRequest = useAkariRequest()

    const fetchMe = async () => {
        try {
            const data = await akariRequest('/api/me', {
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
