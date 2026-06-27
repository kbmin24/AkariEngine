<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" tag="p" />
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else class="diff-page">
        <div class="diff-toolbar mb-3">
            <NuxtLink class="btn btn-sm btn-outline-secondary" :to="`/w/${pagename}?rev=${rev1}`">
                r{{ rev1 }}
            </NuxtLink>
            <NuxtLink class="btn btn-sm btn-outline-secondary" :to="`/w/${pagename}?rev=${rev2}`">
                r{{ rev2 }}
            </NuxtLink>
        </div>
        <div class="diff-content" v-html="diffHtml"></div>
    </div>
</template>

<style scoped>
.diff-page {
    overflow-x: auto;
}

.diff-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

:deep(.d2h-moved-tag) {
    display: none;
}
</style>

<script setup>
definePageMeta({
    key: route => route.path,
})

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/diff/${pagename.value}`,
    {
        key: computed(() => `/diff/${pagename.value}:${route.query.rev1 ?? ''}:${route.query.rev2 ?? ''}`),
        query: {
            rev1: computed(() => route.query.rev1 || undefined),
            rev2: computed(() => route.query.rev2 || undefined),
        },
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const diffHtml = computed(() => data.value?.diffHtml ?? '')
const rev1 = computed(() => data.value?.rev1 ?? route.query.rev1)
const rev2 = computed(() => data.value?.rev2 ?? route.query.rev2)
const diffTitle = computed(() => t('diffTitle', {
    pagename: data.value?.pagename ?? pagename.value,
    rev1: rev1.value ?? '',
    rev2: rev2.value ?? '',
}))

useHeadSafe(computed(() => ({
    title: `${diffTitle.value} - ${config.public.appname}`,
    link: [
        { rel: 'stylesheet', href: '/lib/diff/diff2html.min.css' },
    ],
    script: [
        { src: '/lib/diff/diff2html.min.js', defer: true, tagPosition: 'bodyClose' },
    ],
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('error') })
        return
    }

    setPageHeader({
        title: diffTitle.value,
        pagename: data.value?.pagename ?? pagename.value,
        isPage: true,
        pageMode: 'diff',
    })
}

applyHeader()
watch([data, error, pagename, diffTitle], applyHeader)
</script>
