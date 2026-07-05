<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="contribution-page">
        <div v-if="contributions.length > 0" class="contribution-table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">{{ $t('pages.contribution.page') }}</th>
                        <th scope="col">{{ $t('editMade') }}</th>
                        <th scope="col">{{ $t('datetime') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="item in contributions" :key="contributionKey(item)">
                        <tr>
                            <td>
                                <template v-if="item.type === 'upload'">
                                    <NuxtLink :to="fileLink(item.page)">{{ item.page }}</NuxtLink>
                                    <em class="ms-1">({{ $t('pages.contribution.file') }})</em>
                                </template>
                                <template v-else-if="item.type === 'delete'">
                                    <span>{{ item.page }}</span>
                                </template>
                                <template v-else>
                                    <NuxtLink :to="pageLink(item.page)">{{ item.page }}</NuxtLink>
                                    <span v-if="item.rev" class="ms-1">(r{{ item.rev }})</span>
                                </template>
                            </td>
                            <td>
                                {{ actionLabel(item.type) }}
                                (<span :class="byteChangeClass(item.bytechange)" class="fw-bold">
                                    {{ formatByteChange(item.bytechange) }}
                                </span>)
                            </td>
                            <td>{{ item.date }}</td>
                        </tr>
                        <tr v-if="item.comment">
                            <td class="contribution-comment" colspan="4">{{ item.comment }}</td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
        <p v-else class="text-secondary">{{ $t('pages.contribution.noResults') }}</p>

        <div v-if="count > 0" class="contribution-pagination">
            <ul class="pagination">
                <li v-if="from > 0" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(Math.max(0, from - PAGE_SIZE))"
                        aria-label="Previous">
                        {{ $t('previous') }}
                    </NuxtLink>
                </li>
                <li v-if="from + PAGE_SIZE < count" class="page-item">
                    <NuxtLink class="page-link" :to="paginationLink(from + PAGE_SIZE)" aria-label="Next">
                        {{ $t('next') }}
                    </NuxtLink>
                </li>
            </ul>

            <p>{{ $t('pageNOfM', { page: currentPage, total: totalPages }) }}</p>
        </div>
    </div>
</template>

<script setup>
const PAGE_SIZE = 100

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const username = computed(() => String(route.params.name ?? ''))
const from = computed(() => {
    const value = Number(route.query.from ?? 0)
    if (!Number.isInteger(value) || value < 0) return 0
    return value
})

const { data, error, pending } = await useAkariFetch(
    () => `/api/contribution/${encodeURIComponent(username.value)}`,
    {
        key: computed(() => `/contribution/${username.value}:${from.value}`),
        query: computed(() => ({
            from: from.value || undefined,
        })),
    }
)

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.contribution.dataLoadError')))

const contributions = computed(() => {
    if (!Array.isArray(data.value?.contributions)) return []
    return data.value.contributions.map((item) => {
        const { dataValues, ...root } = item
        return {
            ...(dataValues ?? {}),
            ...root,
        }
    })
})
const count = computed(() => Number(data.value?.count ?? 0))
const totalPages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)))
const currentPage = computed(() => Math.min(totalPages.value, Math.floor(from.value / PAGE_SIZE) + 1))

const contributionKey = item => `${item.page}:${item.rev ?? ''}:${item.type}:${item.date}`
const pageLink = page => `/w/${page}`
const fileLink = page => `/file/${page}`
const paginationLink = linkFrom => ({
    path: route.path,
    query: {
        from: linkFrom,
    },
})

const byteChangeClass = (bytechange) => {
    const value = Number(bytechange)
    if (value > 0) return 'text-success'
    if (value === 0) return 'text-secondary'
    return 'text-danger'
}

const formatByteChange = (bytechange) => {
    const value = Number(bytechange)
    if (value > 0) return `+${value}`
    return String(value)
}

const actionI18nKeys = {
    edit: 'pages.recentChanges.actions.edit',
    delete: 'pages.recentChanges.actions.delete',
    create: 'pages.recentChanges.actions.create',
    upload: 'pages.recentChanges.actions.upload',
    move: 'pages.recentChanges.actions.move',
    revert: 'pages.recentChanges.actions.revert',
    protect: 'pages.recentChanges.actions.protect',
}

const actionLabel = type => {
    const key = actionI18nKeys[type]
    return key ? t(key) : (type || t('pages.recentChanges.actions.unknown'))
}

const pageTitle = computed(() => t('contribListOf', { user: data.value?.username ?? username.value }))

useHeadSafe(computed(() => ({
    title: `${pageTitle.value} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : pageTitle.value,
})

applyHeader()
watch([data, error, username, pageTitle], applyHeader)
</script>

<style scoped>
.contribution-table-wrap {
    overflow-x: auto;
}

.contribution-comment {
    word-break: break-word;
}

.contribution-pagination {
    margin-top: 1rem;
}
</style>
