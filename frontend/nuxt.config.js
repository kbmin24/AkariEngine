// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'

const i18nMustacheToVue = {
    name: 'i18n-mustache-to-vue',
    enforce: 'pre',
    transform(code, id) {
        if (!/locales[\\/](ko_KR|en_GB)\.json$/.test(id)) return null
        const fixed = code
            .replace(/\{\{\{(\w+)\}\}\}/g, '{$1}')
            .replace(/\{\{(\w+)\}\}/g, '{$1}')
        return { code: fixed, map: null }
    },
}
const backendPort = process.env.backendPort || 2000
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },

    modules: ['@nuxtjs/i18n', '@pinia/nuxt'],

    runtimeConfig: {
        public: {
            appname: 'AkariEngine',
            licence: 'CC BY-SA 4.0',
        },
    },

    // TODO: get LocalSetting's port instead of hardcoding
    // socket.io omitted — routeRules proxy does not support WebSocket upgrades
    routeRules: {
        '/': { redirect: '/w/FrontPage' },
        '/api/**': { proxy: `http://localhost:${backendPort}/api/**` },
        '/css/**': { proxy: `http://localhost:${backendPort}/css/**` },
        '/skins/**': { proxy: `http://localhost:${backendPort}/skins/**` },
        '/uploads/**': { proxy: `http://localhost:${backendPort}/uploads/**` },
    },
    devProxy: {
        '/socket.io': {
            target: `http://localhost:${backendPort}/`,
            ws: true
        }
    },

    vite: {
        plugins: [i18nMustacheToVue],
    },

    // todo: sync with LocalSettings.json
    i18n: {
        locales: [
            { code: 'ko', language: 'ko-KR', file: 'ko_KR.json', name: '한국어' },
            { code: 'en', language: 'en-GB', file: 'en_GB.json', name: 'English' },
        ],
        defaultLocale: 'ko',
        langDir: fileURLToPath(new URL('../locales', import.meta.url)),
        compilation: {
            strictMessage: false,
            escapeHtml: false,
        },
    },
})
