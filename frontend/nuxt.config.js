// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'node:url'

let defaultLocale = 'ko'
let appname = 'AkariEngine'
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
        jsonName: file, // Nuxt strips out 'file(s)' property
        name: localeNames[locale] || locale,
    }
})

const discoverSkins = () => {
    try {
        return readdirSync(new URL('../skins/', import.meta.url))
            .filter((skin) => {
                const skinUrl = new URL(`../skins/${skin}/`, import.meta.url)
                return statSync(skinUrl).isDirectory()
                    && existsSync(new URL('manifest.json', skinUrl))
                    && existsSync(new URL('index.vue', skinUrl))
            })
            .sort((a, b) => {
                if (a === 'GECWiki') return -1
                if (b === 'GECWiki') return 1
                return a.localeCompare(b)
            })
            .map((skin) => {
                let manifest = {}
                try {
                    manifest = JSON.parse(readFileSync(new URL(`../skins/${skin}/manifest.json`, import.meta.url), 'utf-8'))
                } catch {
                    manifest = {}
                }

                return {
                    name: skin,
                    label: manifest.name || skin,
                    manifest: {
                        name: manifest.name || skin,
                        version: manifest.version || '',
                        description: manifest.description || '',
                        author: manifest.author || '',
                        licence: manifest.licence || manifest.license || '',
                        license: manifest.license || manifest.licence || '',
                        homepage: manifest.homepage || '',
                    },
                }
            })
    } catch {
        return []
    }
}

availableSkins = discoverSkins()

try {
    const settings = JSON.parse(readFileSync(new URL('../LocalSettings.json', import.meta.url), 'utf-8'))
    if (settings.appname) appname = settings.appname
    if (settings.defaultLocale && localeFiles.includes(`${settings.defaultLocale}.json`)) defaultLocale = settings.defaultLocale.split('_')[0]
    if (settings.adminEmail) adminEmail = settings.adminEmail
    turnstileEnabled = !!settings.turnstile_enabled

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

const backendPort = process.env.backendPort || 2000

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    debug: true,

    css: ['~/assets/scss/main.scss', '@fortawesome/fontawesome-free/css/all.min.css'],

    app: {
        head: {
            link: [
                { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.15.1/katex.min.css', crossorigin: 'anonymous' },
                { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
                [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
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
            {
                name: 'Noto Sans KR',
                provider: 'google',
                weights: ['400', '500', '600', '700'],
            }
        ]
    },

    runtimeConfig: {
        skinAssetsRoot: fileURLToPath(new URL('../skins/', import.meta.url)),
        public: {
            appname,
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
        fallbackLocale: defaultLocale,
        strategy: 'no_prefix',
        langDir: '../../locales/',
        vueI18n: 'i18n.config.js',
        compilation: {
            strictMessage: false,
            escapeHtml: false,
        },
        detectBrowserLanguage: false,
    },

})
