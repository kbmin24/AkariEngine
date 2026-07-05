<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else class="admin-log-page">
        <form class="admin-log-filter" @submit.prevent="applyFilters">
            <div class="mb-3 row">
                <label for="doneBy" class="col-sm-2 col-form-label">{{ $t('pages.adminLog.doneBy') }}</label>
                <div class="col-sm-10">
                    <input id="doneBy" v-model="doneByInput" type="text" maxlength="255" class="form-control">
                </div>
            </div>
            <div class="mb-3 row">
                <label for="job" class="col-sm-2 col-form-label">{{ $t('pages.adminLog.job') }}</label>
                <div class="col-sm-10">
                    <input id="job" v-model="jobInput" type="text" maxlength="255" class="form-control">
                </div>
            </div>
            <div class="mt-3">
                <button type="submit" class="btn btn-primary">{{ $t('pages.adminLog.view') }}</button>
            </div>
        </form>

        <div v-if="logs.length > 0" class="admin-log-table-wrap">
            <table class="table admin-log-table">
                <colgroup>
                    <col class="admin-log-date-col">
                    <col class="admin-log-user-col">
                    <col class="admin-log-job-col">
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">{{ $t('datetime') }}</th>
                        <th scope="col">{{ $t('pages.adminLog.doneBy') }}</th>
                        <th scope="col">{{ $t('pages.adminLog.job') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="log in logs" :key="adminLogKey(log)">
                        <td>{{ log.date }}</td>
                        <td class="admin-log-cell">
                            <UserTooltip :user="log.username" />
                        </td>
                        <td class="admin-log-cell">{{ log.job }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else class="text-secondary">{{ $t('pages.adminLog.noResults') }}</p>

        <div v-if="count > 0" class="admin-log-pagination">
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
definePageMeta({
    key: route => route.fullPath,
})

const PAGE_SIZE = 30

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const doneBy = computed(() => typeof route.query.doneBy === 'string' ? route.query.doneBy : '')
const job = computed(() => typeof route.query.job === 'string' ? route.query.job : '')
const from = computed(() => {
    const value = Number(route.query.from ?? 0)
    if (!Number.isInteger(value) || value < 0) return 0
    return value
})

const doneByInput = ref(doneBy.value)
const jobInput = ref(job.value)

watch(doneBy, value => {
    doneByInput.value = value
})

watch(job, value => {
    jobInput.value = value
})

const { data, error, pending } = await useAkariFetch('/api/adminlog', {
    key: computed(() => `/adminlog:${from.value}:${doneBy.value}:${job.value}`),
    query: computed(() => ({
        from: from.value || undefined,
        doneBy: doneBy.value || undefined,
        job: job.value || undefined,
    })),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.adminLog.dataLoadError')))

const logs = computed(() => {
    if (!Array.isArray(data.value?.logs)) return []
    return data.value.logs.map((item) => {
        const { dataValues, ...root } = item
        return {
            ...(dataValues ?? {}),
            ...root,
            date: root.date ?? dataValues?.date ?? '',
            username: root.username ?? dataValues?.username ?? '',
            job: root.job ?? dataValues?.job ?? '',
        }
    })
})
const count = computed(() => Number(data.value?.count ?? 0))
const totalPages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)))
const currentPage = computed(() => Math.min(totalPages.value, Math.floor(from.value / PAGE_SIZE) + 1))

const adminLogKey = log => `${log.id ?? ''}:${log.username}:${log.job}:${log.date}`

const filterQuery = (linkFrom = 0) => {
    const query = {}
    if (linkFrom > 0) query.from = linkFrom
    if (doneBy.value) query.doneBy = doneBy.value
    if (job.value) query.job = job.value
    return query
}

const paginationLink = linkFrom => ({
    path: route.path,
    query: filterQuery(linkFrom),
})

const applyFilters = async () => {
    const query = {}
    const nextDoneBy = doneByInput.value.trim()
    const nextJob = jobInput.value.trim()

    if (nextDoneBy) query.doneBy = nextDoneBy
    if (nextJob) query.job = nextJob

    await navigateTo({
        path: route.path,
        query,
    })
}

useHeadSafe(computed(() => ({
    title: `${t('adminLog')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('adminLog'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.admin-log-filter {
    max-width: 48rem;
}

.admin-log-table-wrap {
    overflow-x: auto;
}

.admin-log-table {
    min-width: 100%;
}

.admin-log-date-col {
    min-width: 12rem;
}

.admin-log-user-col {
    min-width: 10rem;
}

.admin-log-job-col {
    min-width: 24rem;
}

.admin-log-cell {
    overflow-wrap: anywhere;
}

.admin-log-pagination {
    margin-top: 1rem;
}
</style>
