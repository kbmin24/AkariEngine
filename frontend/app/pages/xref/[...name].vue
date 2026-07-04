<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="xref-page">
        <p>{{ $t('pages.xref.resultCount', { count }) }}</p>

        <ul v-if="entries.length > 0" class="list-group list-group-flush xref-page-list">
            <li v-for="entry in entries" :key="entry.source" class="list-group-item">
                <NuxtLink :to="pageLink(entry.source)">{{ entry.source }}</NuxtLink>
            </li>
        </ul>
        <p v-else class="text-secondary">{{ $t('pages.xref.noResults') }}</p>

        <div v-if="count > 0" class="xref-page-pagination">
            <ul class="pagination">
                <li v-if="from > 1" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(from - pgSize, from - 1)" aria-label="Previous">
                        {{ $t('previous') }}
                    </NuxtLink>
                </li>
                <li v-if="currentPage < totalPages" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(to + 1, to + pgSize)" aria-label="Next">
                        {{ $t('next') }}
                    </NuxtLink>
                </li>
            </ul>

            <p>{{ $t('pageNOfM', { page: currentPage, total: totalPages }) }}</p>
        </div>
    </div>
</template>

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
    if (Array.isArray(parts)) return parts.filter(part => part !== '').join('/')
    return String(parts ?? '')
})

const { data, error, pending } = await useFetch(
    () => `/api/xref/${pagename.value}`,
    {
        key: computed(() => `/xref/${pagename.value}:${route.query.from ?? ''}:${route.query.to ?? ''}`),
        query: {
            from: computed(() => route.query.from || undefined),
            to: computed(() => route.query.to || undefined),
        },
    }
)

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.xref.dataLoadError')))

const pageTitle = computed(() => data.value?.title ?? pagename.value)
const count = computed(() => Number(data.value?.count ?? 0))
const entries = computed(() => Array.isArray(data.value?.entries) ? data.value.entries : [])
const headerTitle = computed(() => t('xrefTo', { page: pageTitle.value }))
const from = computed(() => Number(data.value?.from ?? 1))
const to = computed(() => Number(data.value?.to ?? 0))
const pgSize = computed(() => Number(data.value?.pgSize ?? 30))
const totalPages = computed(() => Math.max(1, Math.ceil(count.value / pgSize.value)))
const currentPage = computed(() => Math.max(1, Math.ceil(from.value / pgSize.value)))

const pageLink = page => `/w/${page}`
const paginationLink = (linkFrom, linkTo) => ({
    path: `/xref/${pagename.value}`,
    query: {
        from: linkFrom,
        to: linkTo,
    },
})

useHeadSafe(computed(() => ({
    title: `${headerTitle.value} - ${config.public.appname}`,
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('error') })
        return
    }

    setPageHeader({
        title: headerTitle.value,
        pagename: data.value?.pagename ?? pagename.value,
        isPage: true,
        pageMode: 'xref',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)
</script>

<style scoped>
.xref-page-list {
    max-width: 48rem;
}

.xref-page-pagination {
    margin-top: 1rem;
}
</style>
