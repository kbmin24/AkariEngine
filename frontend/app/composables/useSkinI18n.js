const SKIN_LOCALES = import.meta.glob('../../../skins/*/locales/*.json')

export const useSkinI18n = async (skinName) => {
    const { locale, localeProperties, mergeLocaleMessage } = useI18n()

    const load = async () => {
        const file = localeProperties.value?.jsonName
        if (!file) return

        const loader = SKIN_LOCALES[`../../../skins/${skinName}/locales/${file}`]
        if (!loader) return

        const messages = await loader()
        mergeLocaleMessage(locale.value, messages.default ?? messages)
    }

    await load()
    watch(locale, load)
}
