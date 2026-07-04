<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="licence-page">
        <section class="licence-section">
            <h2>{{ app.name }} {{ app.version }}</h2>
            <p>{{ app.copyright }}</p>
            <p>
                This program is free software: you can redistribute it and/or modify it under the terms of the
                GNU Affero General Public License as published by the Free Software Foundation, either version 3
                of the License, or (at your option) any later version.
            </p>
            <p>
                This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
                even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
                Affero General Public License for more details.
            </p>
            <p>
                You should have received a copy of the GNU Affero General Public License along with this program.
                If not, <a :href="app.license.url" target="_blank" rel="noopener noreferrer">read online</a>.
            </p>
            <p>
                Source code of this software is available
                <a :href="app.sourceUrl" target="_blank" rel="noopener noreferrer">here</a>.
            </p>
            <p>
                <small>
                    AkariEngine is dedicated to
                    <a href="https://yuruyuri.fandom.com/wiki/Akari_Akaza" target="_blank" rel="noopener noreferrer">
                        Akaza Akari
                    </a>.
                </small>
            </p>
        </section>

        <section class="licence-section">
            <h2>Open source licence</h2>
            <ul class="licence-list">
                <li v-for="item in openSourceLicences" :key="item.name">
                    <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.name }}</a>
                    <br>
                    {{ item.author }}
                    <br>
                    {{ item.licence }}
                </li>
            </ul>
        </section>

        <section class="licence-section">
            <h2>Skins installed</h2>
            <ul v-if="skins.length > 0" class="licence-list">
                <li v-for="skin in skins" :key="skin.name">
                    <a v-if="skin.manifest.homepage" :href="skin.manifest.homepage" target="_blank"
                        rel="noopener noreferrer">
                        {{ skin.manifest.name }}
                    </a>
                    <span v-else>{{ skin.manifest.name }}</span>
                    <small v-if="skin.manifest.version"> v{{ skin.manifest.version }}</small>
                    <template v-if="skin.manifest.description">: {{ skin.manifest.description }}</template>
                    <br v-if="skin.manifest.author">
                    <template v-if="skin.manifest.author">{{ skin.manifest.author }}</template>
                    <br v-if="skinLicense(skin)">
                    <template v-if="skinLicense(skin)">{{ skinLicense(skin) }}</template>
                </li>
            </ul>
            <p v-else class="text-secondary">No skins installed.</p>
        </section>

        <section class="licence-section">
            <h2>Extensions installed</h2>
            <ul v-if="extensions.length > 0" class="licence-list">
                <li v-for="extension in extensions" :key="extension.name">
                    <a v-if="extension.manifest.homepage" :href="extension.manifest.homepage" target="_blank"
                        rel="noopener noreferrer">
                        {{ extension.manifest.name }}
                    </a>
                    <span v-else>{{ extension.manifest.name }}</span>
                    <small v-if="extension.manifest.version"> v{{ extension.manifest.version }}</small>
                    <template v-if="extension.manifest.description">: {{ extension.manifest.description }}</template>
                    <br v-if="extension.manifest.author">
                    <template v-if="extension.manifest.author">{{ extension.manifest.author }}</template>
                    <br v-if="extensionLicense(extension)">
                    <template v-if="extensionLicense(extension)">{{ extensionLicense(extension) }}</template>
                </li>
            </ul>
            <p v-else class="text-secondary">No extensions installed.</p>
        </section>
    </div>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const { data, error, pending } = await useFetch('/api/Licence', {
    key: '/Licence',
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('dataLoadError')))

const app = computed(() => data.value?.app ?? {
    name: config.public.appname,
    version: '',
    copyright: '',
    sourceUrl: 'https://github.com/kbmin24/AkariEngine',
    license: {
        url: 'https://www.gnu.org/licenses/',
    },
})
const skins = computed(() => Array.isArray(config.public.availableSkins) ? config.public.availableSkins : [])
const extensions = computed(() => Array.isArray(data.value?.extensions) ? data.value.extensions : [])

const packageLicense = item => item.manifest?.licence || item.manifest?.license || ''
const skinLicense = skin => packageLicense(skin)
const extensionLicense = extension => packageLicense(extension)

const openSourceLicences = [
    {
        name: 'Bootstrap',
        url: 'https://getbootstrap.com/',
        author: 'Twitter, Inc. and the Bootstrap Authors.',
        licence: 'MIT Licence',
    },
    {
        name: 'Nuxt',
        url: 'https://nuxt.com/',
        author: 'Nuxt contributors',
        licence: 'MIT Licence',
    },
    {
        name: 'Express',
        url: 'https://expressjs.com/',
        author: 'TJ Holowaychuk and contributors',
        licence: 'MIT Licence',
    },
    {
        name: 'Font Awesome',
        url: 'http://fontawesome.io',
        author: 'Dave Gandy',
        licence: 'SIL OFL 1.1, MIT Licence',
    },
    {
        name: 'diff2html',
        url: 'https://github.com/rtfpessoa/diff2html',
        author: 'Rodrigo Fernandes',
        licence: 'MIT Licence',
    },
    {
        name: 'socket.io',
        url: 'https://socket.io/',
        author: 'Socket.IO contributors',
        licence: 'MIT Licence',
    },
    {
        name: 'KaTeX',
        url: 'https://katex.org',
        author: 'Khan Academy',
        licence: 'MIT Licence',
    },
    {
        name: 'Liberty-MW-Skin',
        url: 'https://gitlab.com/librewiki/Liberty-MW-Skin',
        author: 'Librewiki',
        licence: 'GNU GPL version 3',
    },
]

useHeadSafe(computed(() => ({
    title: `${t('licence')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('licence'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.licence-page {
    max-width: 64rem;
}

.licence-section {
    margin-bottom: 2rem;
}

.licence-section h2 {
    margin-bottom: 0.75rem;
}

.licence-list {
    padding-left: 1.25rem;
}

.licence-list li {
    margin-bottom: 0.9rem;
}
</style>
