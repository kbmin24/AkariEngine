export const useSkinSetting = (settingName, defaultValue, options = {}) => {
    const userStore = useUserStore()
    const skinName = computed(() => options.skinName ?? userStore.skin ?? 'GECWiki')
    const storageKey = computed(() => `${skinName.value.toLowerCase()}_${settingName}`)
    const values = useState('skin-settings', () => ({}))
    const value = computed({
        get() {
            return values.value[storageKey.value] ?? defaultValue
        },
        set(nextValue) {
            values.value = {
                ...values.value,
                [storageKey.value]: nextValue,
            }
        },
    })

    const load = () => {
        if (!import.meta.client) return value.value

        const stored = localStorage.getItem(storageKey.value)
        const legacyStored = options.legacyKey ? localStorage.getItem(options.legacyKey) : null
        const raw = stored ?? legacyStored

        if (raw === null) {
            value.value = defaultValue
            return value.value
        }

        try {
            value.value = JSON.parse(raw)
        } catch {
            value.value = raw
        }

        return value.value
    }

    const save = (nextValue) => {
        value.value = nextValue

        if (import.meta.client) {
            localStorage.setItem(storageKey.value, JSON.stringify(nextValue))
        }
    }

    return { value, load, save, storageKey, skinName }
}
