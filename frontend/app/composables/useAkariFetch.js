const normalizeHeaders = headers => {
    const value = toValue(headers)
    if (!value) return {}
    if (value instanceof Headers) return Object.fromEntries(value.entries())
    if (Array.isArray(value)) return Object.fromEntries(value)
    return { ...value }
}

export const useAkariLocaleHeader = () => {
    const { localeProperties } = useI18n()
    const apiLocale = computed(() => localeProperties.value?.jsonName?.replace(/\.json$/, ''))

    const withLocaleHeader = headers => ({
        ...normalizeHeaders(headers),
        ...(apiLocale.value ? { 'akari-locale': apiLocale.value } : {}),
    })

    return { apiLocale, withLocaleHeader }
}

export const useAkariFetch = (request, options = {}) => {
    const { apiLocale, withLocaleHeader } = useAkariLocaleHeader()
    const watch = options.watch === false
        ? false
        : [...(Array.isArray(options.watch) ? options.watch : options.watch ? [options.watch] : []), apiLocale]

    return useFetch(request, {
        ...options,
        headers: computed(() => withLocaleHeader(options.headers)),
        ...(watch === false ? {} : { watch }),
    })
}

export const useAkariRequest = () => {
    const { withLocaleHeader } = useAkariLocaleHeader()

    return (request, options = {}) => $fetch(request, {
        ...options,
        headers: withLocaleHeader(options.headers),
    })
}
