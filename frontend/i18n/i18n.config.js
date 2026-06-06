export default defineI18nConfig(() => ({
    datetimeFormats: {
        ko: {
            full: {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }
        },
        en: {
            full: {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }
        }
    },
}))
