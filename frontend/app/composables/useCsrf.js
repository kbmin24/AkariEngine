let cachedToken = null

export const useCsrf = () => {
    const getToken = async () => {
        if (cachedToken) return cachedToken
        const data = await $fetch('/api/csrf-token', {
            cache: 'no-store',
            credentials: 'include',
        })
        cachedToken = data.csrfToken
        return cachedToken
    }

    const csrfFetch = async (url, options = {}) => {
        const sendRequest = async token => $fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...options.headers,
                'x-csrf-token': token,
            },
        })

        try {
            return await sendRequest(await getToken())
        } catch (error) {
            if (error?.data?.i18nKey !== 'csrfMessage') throw error

            invalidate()
            return sendRequest(await getToken())
        }
    }

    const invalidate = () => { cachedToken = null }

    return { getToken, csrfFetch, invalidate }
}
