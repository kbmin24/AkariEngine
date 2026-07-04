// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync, readdirSync } from 'fs'

let defaultLocale = 'ko'
let adminEmail = ''
let privacyPolicy = null
let turnstileEnabled = false
let tos = null
let availableSkins = []
const localeNames = {
    ko_KR: '\uD55C\uAD6D\uC5B4',
    en_GB: 'English',
}
const localeFiles = (() => {
    try {
        return readdirSync(new URL('../locales/', import.meta.url))
            .filter((file) => /^[a-z]{2}_[A-Z]{2}\.json$/.test(file))
            .sort()
    } catch {
        return ['ko_KR.json', 'en_GB.json']
    }
})()
const locales = localeFiles.map((file) => {
    const locale = file.replace(/\.json$/, '')
    const [language, region] = locale.split('_')
    return {
        code: language,
        language: region ? `${language}-${region}` : language,
        file,
        name: localeNames[locale] || locale,
    }
})
try {
    const settings = JSON.parse(readFileSync(new URL('../LocalSettings.json', import.meta.url), 'utf-8'))
    if (settings.defaultLocale && localeFiles.includes(`${settings.defaultLocale}.json`)) defaultLocale = settings.defaultLocale.split('_')[0]
    if (settings.adminEmail) adminEmail = settings.adminEmail
    turnstileEnabled = !!settings.turnstile_enabled
    availableSkins = (settings.skins ?? [])
        .filter((skin) => existsSync(new URL(`./skins/${skin}/index.vue`, import.meta.url)))
        .map((skin) => {
            try {
                const manifest = JSON.parse(readFileSync(new URL(`../skins/${skin}/manifest.json`, import.meta.url), 'utf-8'))
                return { name: skin, label: manifest.name || skin }
            } catch {
                return { name: skin, label: skin }
            }
        })

    const privacyPolicyPath = settings.privacyPolicy
    if (privacyPolicyPath) {
        privacyPolicy = readFileSync(new URL(`../${privacyPolicyPath}`, import.meta.url), 'utf-8')
    }
    const tosPath = settings.termsOfService
    if (tosPath) {
        tos = readFileSync(new URL(`../${tosPath}`, import.meta.url), 'utf-8')
    }
} catch {
    // LocalSettings.json missing — fall back to defaults
}

const i18nMustacheToVue = {
    name: 'i18n-mustache-to-vue',
    enforce: 'pre',
    transform(code, id) {
        if (!localeFiles.some((file) => id.endsWith(`locales/${file}`) || id.endsWith(`locales\\${file}`))) return null
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

    css: ['~/assets/scss/main.scss', '@fortawesome/fontawesome-free/css/all.min.css'],

    app: {
        head: {
            link: [
                { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.15.1/katex.min.css', crossorigin: 'anonymous' },
                { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
            ],
            script: [
                { src: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.15.1/katex.min.js', crossorigin: 'anonymous', tagPosition: 'bodyClose' },
                { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', tagPosition: 'bodyClose' },
                ...(turnstileEnabled ? [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true, defer: true }] : []),
            ],
        },
    },
    devServer: {
        host: '::'
    },

    modules: ['@nuxtjs/i18n', '@pinia/nuxt', '@nuxt/fonts'],

    fonts: {
        families: [
            { name: 'Noto Sans KR',
                provider: 'google',
                weights: ['400', '500', '600', '700'],
            }
        ]
    },

    runtimeConfig: {
        public: {
            appname: 'AkariEngine',
            licence: 'CC BY-SA 4.0',
            adminEmail,
            privacyPolicy,
            tos,
            availableSkins,
        },
    },

    routeRules: {
        '/': { redirect: '/w/FrontPage' },
        '/api/**': { proxy: `http://localhost:${backendPort}/api/**` },
        '/css/**': { proxy: `http://localhost:${backendPort}/css/**` },
        '/lib/**': { proxy: `http://localhost:${backendPort}/lib/**` },
        '/skins/**': { proxy: `http://localhost:${backendPort}/skins/**` },
        '/uploads/**': { proxy: `http://localhost:${backendPort}/uploads/**` },
    },
    nitro: {
        devProxy: {
            '/lib': {
                target: `http://localhost:${backendPort}/lib`,
                changeOrigin: true,
            },
            '/socket.io': {
                target: `http://localhost:${backendPort}/socket.io`,
                ws: true,
                changeOrigin: true,
            }
        }, 
    },

    vite: {
        plugins: [i18nMustacheToVue],
        css: {
            preprocessorOptions: {
                scss: {
                    quietDeps: true,
                    silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'if-function']
                },
                sass: {
                    quietDeps: true,
                    silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'if-function']
                }
            }
        }
    },

    i18n: {
        locales,
        defaultLocale,
        strategy: 'no_prefix',
        langDir: '../../locales/',
        vueI18n: 'i18n.config.js',
        compilation: {
            strictMessage: false,
            escapeHtml: false,
        },
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_redirected',
            redirectOn: 'all',
        },
    },

})
