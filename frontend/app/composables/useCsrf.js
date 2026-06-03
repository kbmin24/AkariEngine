let cachedToken = null

export const useCsrf = () => {
    const getToken = async () => {
        if (cachedToken) return cachedToken
        const data = await $fetch('/api/csrf-token')
        cachedToken = data.csrfToken
        return cachedToken
    }

    const csrfFetch = async (url, options = {}) => {
        const token = await getToken()
        return $fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'x-csrf-token': token,
            },
        })
    }

    const invalidate = () => { cachedToken = null }

    return { getToken, csrfFetch, invalidate }
}
