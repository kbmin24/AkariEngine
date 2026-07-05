<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else>
        <div class="recent-discuss-toolbar">
            <NuxtLink class="btn" :class="isOpen ? 'btn-primary' : 'btn-secondary'" :to="statusLink(true)">
                {{ $t('pages.recentDiscuss.open') }}
            </NuxtLink>
            <NuxtLink class="btn" :class="!isOpen ? 'btn-primary' : 'btn-secondary'" :to="statusLink(false)">
                {{ $t('pages.recentDiscuss.closed') }}
            </NuxtLink>
        </div>

        <div class="recent-discuss-table-wrap">
            <table class="table recent-discuss-table">
                <colgroup>
                    <col class="recent-discuss-thread-col">
                    <col class="recent-discuss-page-col">
                    <col class="recent-discuss-date-col">
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">{{ $t('pages.recentDiscuss.thread') }}</th>
                        <th scope="col">{{ $t('pages.recentDiscuss.page') }}</th>
                        <th scope="col">{{ $t('pages.recentDiscuss.datetime') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="discussion in discussions" :key="discussion.id ?? discussion.threadID">
                        <th scope="row" class="recent-discuss-cell">
                            <NuxtLink :to="threadLink(discussion.threadID)">{{ discussion.dataValues.threadname }}</NuxtLink>
                        </th>
                        <td class="recent-discuss-cell">
                            <NuxtLink :to="pageLink(discussion.pagename)">{{ discussion.dataValues.pagename }}</NuxtLink>
                        </td>
                        <td>{{ formatDate(discussion) }}</td>
                    </tr>
                    <tr v-if="discussions.length === 0">
                        <td colspan="3">{{ noResultsMessage }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
}

const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const isOpen = computed(() => route.query.isopen !== 'false')

const { data, error, pending } = await useAkariFetch('/api/RecentDiscuss', {
    key: computed(() => `/RecentDiscuss:${isOpen.value}`),
    query: computed(() => ({
        isopen: isOpen.value ? 'true' : 'false',
    })),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.recentDiscuss.dataLoadError')))

const decodeSanitizedField = value => String(value ?? '').replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g,
    entity => entityMap[entity]
)

const discussions = computed(() => {
    const changes = Array.isArray(data.value?.changes) ? data.value.changes : []
    return changes.map(discussion => ({
        ...discussion,
        threadname: decodeSanitizedField(discussion.threadname),
        threadID: decodeSanitizedField(discussion.threadID),
        pagename: decodeSanitizedField(discussion.pagename),
    }))
})

const noResultsMessage = computed(() => isOpen.value
    ? t('pages.recentDiscuss.noOpenResults')
    : t('pages.recentDiscuss.noClosedResults'))

const formatDate = discussion => {
    if (discussion.date) return discussion.date

    const value = discussion.updatedAt || discussion.createdAt
    if (!value) return ''

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    return new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date)
}

const pageLink = page => `/w/${page}`
const threadLink = threadID => `/thread/${threadID}`
const statusLink = nextIsOpen => ({
    path: route.path,
    query: {
        ...route.query,
        isopen: nextIsOpen ? 'true' : 'false',
    },
})

useHeadSafe(computed(() => ({
    title: `${t('pages.recentDiscuss.title')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('pages.recentDiscuss.error') : t('pages.recentDiscuss.title'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.recent-discuss-toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.recent-discuss-table-wrap {
    min-height: 100vh;
    overflow-x: auto;
}

.recent-discuss-table {
    min-width: 100%;
}

.recent-discuss-thread-col,
.recent-discuss-page-col {
    min-width: 40%;
}

.recent-discuss-date-col {
    min-width: 100px;
}

.recent-discuss-cell {
    overflow-wrap: anywhere;
}
</style>
