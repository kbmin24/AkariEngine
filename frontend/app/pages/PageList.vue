<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="page-list">
        <p>{{ $t('pages.pageList.resultCount', { count }) }}</p>

        <ul v-if="pages.length > 0" class="list-group list-group-flush page-list-items">
            <li v-for="page in pages" :key="page.title" class="list-group-item">
                <NuxtLink :to="pageLink(page.title)">{{ page.title }}</NuxtLink>
            </li>
        </ul>
        <p v-else class="text-secondary">{{ $t('pages.pageList.noResults') }}</p>

        <div v-if="count > 0" class="page-list-pagination">
            <ul class="pagination">
                <li v-if="displayPage > 1" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(displayPage - 1)" aria-label="Previous">
                        {{ $t('previous') }}
                    </NuxtLink>
                </li>
                <li v-if="displayPage < totalPages" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(displayPage + 1)" aria-label="Next">
                        {{ $t('next') }}
                    </NuxtLink>
                </li>
            </ul>

            <p>{{ $t('pageNOfM', { page: displayPage, total: totalPages }) }}</p>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const PAGE_SIZE = 50

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const requestedPage = computed(() => {
    const page = Number(route.query.page ?? 1)
    if (!Number.isInteger(page) || page < 1) return 1
    return page
})

const { data, error, pending } = await useAkariFetch('/api/PageList', {
    key: computed(() => `/PageList:${requestedPage.value}`),
    query: computed(() => ({
        page: requestedPage.value,
    })),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.pageList.dataLoadError')))

const pages = computed(() => Array.isArray(data.value?.pages) ? data.value.pages : [])
const count = computed(() => Number(data.value?.count ?? 0))
const currentPage = computed(() => Number(data.value?.currentPage ?? requestedPage.value))
const totalPages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)))
const displayPage = computed(() => Math.min(Math.max(1, currentPage.value), totalPages.value))

const pageLink = title => `/w/${title}`
const paginationLink = page => ({
    path: route.path,
    query: {
        page,
    },
})

useHeadSafe(computed(() => ({
    title: `${t('pageList')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('pageList'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.page-list-items {
    max-width: 48rem;
}

.page-list-pagination {
    margin-top: 1rem;
}
</style>
