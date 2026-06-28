<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="orphaned-page">
        <i18n-t keypath="pages.orphaned.desc_pt1" tag="p">
            <template #link>
                <NuxtLink to="/w/FrontPage">FrontPage</NuxtLink>
            </template>
        </i18n-t>
        <p>{{ $t('pages.orphaned.desc_pt2') }}</p>

        <ul v-if="pages.length > 0" class="list-group list-group-flush orphaned-page-list">
            <li v-for="page in pages" :key="page" class="list-group-item">
                <NuxtLink :to="pageLink(page)">{{ page }}</NuxtLink>
            </li>
        </ul>
        <p v-else class="text-secondary">{{ $t('pages.orphaned.noResults') }}</p>

        <div>
            <ul class="pagination">
                <li v-if="from > 0" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(Math.max(0, from - 30))" aria-label="Previous">
                        {{ $t('previous') }}
                    </NuxtLink>
                </li>
                <li v-if="from + 30 < pageCount" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(from + 30)" aria-label="Next">
                        {{ $t('next') }}
                    </NuxtLink>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const route = useRoute()

const from = computed(() => {
    const value = Number(route.query.from ?? 0)
    if (!Number.isInteger(value) || value < 0) return 0
    return value
})

const { data, error, pending } = await useFetch('/api/orphaned', {
    key: computed(() => `/orphaned:${from.value}`),
    query: computed(() => ({
        from: from.value || undefined,
    })),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.orphaned.dataLoadError')))

const pageTitle = page => {
    if (typeof page === 'string') return page
    return page?.title ?? page?.page ?? ''
}

const pages = computed(() => {
    if (!Array.isArray(data.value?.pages)) return []
    return data.value.pages.map(pageTitle).filter(Boolean)
})

const pageCount = computed(() => Number(data.value?.count ?? 0))

const pageLink = page => `/w/${page}`
const paginationLink = (linkFrom) => ({
    path: route.path,
    query: {
        from: linkFrom,
    },
})

useHeadSafe(computed(() => ({
    title: `${t('pages.orphaned.title')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('pages.orphaned.title'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.orphaned-page-list {
    max-width: 48rem;
    margin-top: 1rem;
}
</style>
