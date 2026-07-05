<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="category-page">
        <p>{{ $t('pages.category.resultCount', { count: pageCount }) }}</p>

        <ul v-if="pages.length > 0" class="list-group list-group-flush category-page-list">
            <li v-for="page in pages" :key="page.page" class="list-group-item">
                <NuxtLink :to="pageLink(page.page)">{{ page.page }}</NuxtLink>
            </li>
        </ul>
        <p v-else class="text-secondary">{{ $t('pages.category.noResults') }}</p>

        <div v-if="pageCount > 0" class="category-page-pagination">
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

const categoryName = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(part => part !== '').join('/')
    return String(parts ?? '')
})

const { data, error, pending } = await useAkariFetch(
    () => `/api/category/${categoryName.value}`,
    {
        key: computed(() => `/category/${categoryName.value}:${route.query.from ?? ''}:${route.query.to ?? ''}`),
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
    : (errorDetails.value?.message ?? t('pages.category.dataLoadError')))

const categoryTitle = computed(() => data.value?.category ?? categoryName.value)
const pagesResult = computed(() => data.value?.pages ?? {})
const pageCount = computed(() => Number(data.value?.pageCount ?? pagesResult.value.count ?? 0))
const pages = computed(() => Array.isArray(pagesResult.value.rows) ? pagesResult.value.rows : [])
const from = computed(() => Number(data.value?.from ?? 1))
const to = computed(() => Number(data.value?.to ?? 0))
const pgSize = computed(() => Number(data.value?.pgSize ?? 30))
const totalPages = computed(() => Math.max(1, Math.ceil(pageCount.value / pgSize.value)))
const currentPage = computed(() => Math.max(1, Math.ceil(from.value / pgSize.value)))

const pageLink = page => `/w/${page}`
const paginationLink = (linkFrom, linkTo) => ({
    path: `/category/${categoryName.value}`,
    query: {
        from: linkFrom,
        to: linkTo,
    },
})
const headerTitle = computed(() => t('pages.category.title', { category: categoryTitle.value }))

useHeadSafe(computed(() => ({
    title: `${headerTitle.value} - ${config.public.appname}`,
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('pages.category.error') })
        return
    }

    setPageHeader({ title: headerTitle.value })
}

applyHeader()
watch([data, error, categoryName, headerTitle], applyHeader)
</script>

<style scoped>
.category-page-list {
    max-width: 48rem;
}

.category-page-pagination {
    margin-top: 1rem;
}
</style>
