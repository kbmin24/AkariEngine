<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" tag="p" />
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else>
        <form class="history-compare-form" @submit.prevent="compareRevisions">
            <div class="mb-3 row">
                <label for="rev1" class="col-sm-2 col-form-label history-compare-label">
                    {{ $t('historyv1') }}
                </label>
                <div class="col-sm-10 history-compare-input">
                    <input id="rev1" v-model="rev1" type="number" class="form-control" min="1">
                </div>
            </div>
            <div class="mb-3 row">
                <label for="rev2" class="col-sm-2 col-form-label history-compare-label">
                    {{ $t('historyv2') }}
                </label>
                <div class="col-sm-10 history-compare-input">
                    <input id="rev2" v-model="rev2" type="number" class="form-control" min="1">
                </div>
            </div>
            <div class="mb-3 row">
                <button type="submit" class="btn btn-primary history-compare-button">
                    {{ $t('compare') }}
                </button>
            </div>
        </form>

        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">{{ $t('revision') }}</th>
                        <th scope="col">{{ $t('username') }}</th>
                        <th scope="col">{{ $t('editMade') }}</th>
                        <th scope="col">{{ $t('datetime') }}</th>
                        <th scope="col" style="width: 180px;"></th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="change in displayedChanges" :key="`${change.page}-${change.rev}`">
                        <tr>
                            <th scope="row">
                                <NuxtLink :to="`/w/${change.page}?rev=${change.rev}`">r{{ change.rev }}</NuxtLink>
                                (<span :class="byteChangeClass(change.bytechange)" class="fw-bold">
                                    {{ formatByteChange(change.bytechange) }}
                                </span>)
                            </th>
                            <td>
                                <UserTooltip :user="change.editedby" />
                            </td>
                            <td>{{ $t(actionI18nLookup(change.type)) }}</td>
                            <td>{{ change.date }}</td>
                            <td>
                                <a :href="rawLink(change)" rel="nofollow">RAW</a>
                                <template v-if="canRevert(change)">
                                    |
                                    <NuxtLink :to="`/revert/${change.page}?rev=${change.rev}`" rel="nofollow">
                                        {{ $t('revert') }}
                                    </NuxtLink>
                                </template>
                                <template v-if="change.rev > 1">
                                    |
                                    <NuxtLink :to="`/diff/${change.page}?rev1=${change.rev}&rev2=${change.rev - 1}`"
                                        rel="nofollow">
                                        {{ $t('pages.history.diff') }}
                                    </NuxtLink>
                                </template>
                            </td>
                        </tr>
                        <tr v-if="change.comment">
                            <td style="word-wrap: anywhere;" colspan="5">{{ change.comment }}</td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <div>
            <ul class="pagination">
                <li v-if="from > 1" class="page-item">
                    <NuxtLink class="page-link" :to="pageLink(from - pgSize, from - 1)" aria-label="Previous">
                        {{ $t('previous') }}
                    </NuxtLink>
                </li>
                <li v-if="to < historyCount" class="page-item">
                    <NuxtLink class="page-link" :to="pageLink(to + 1, to + pgSize)" aria-label="Next">
                        {{ $t('next') }}
                    </NuxtLink>
                </li>
            </ul>
        </div>

        <p>{{ $t('pageNOfM', { page: currentPage, total: totalPages }) }}</p>
    </div>
</template>

<style scoped>
.history-compare-form {
    width: 350px;
}

.history-compare-label {
    width: 250px;
}

.history-compare-input {
    width: 120px;
}

.history-compare-button {
    width: 100px;
    margin: auto;
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

const { data, error, pending } = await useAkariFetch(
    () => `/api/history/${pagename.value}`,
    {
        key: computed(() => `/history/${pagename.value}:${route.query.from ?? ''}:${route.query.to ?? ''}`),
        query: {
            from: computed(() => route.query.from || undefined),
            to: computed(() => route.query.to || undefined),
        },
    }
)

const rev1 = ref('')
const rev2 = ref('')

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const changes = computed(() => data.value?.changes ?? [])
const from = computed(() => Number(data.value?.from ?? 1))
const to = computed(() => Number(data.value?.to ?? 0))
const historyCount = computed(() => Number(data.value?.historyCount ?? 0))
const pgSize = computed(() => Number(data.value?.pgSize ?? 30))
const totalPages = computed(() => Math.max(1, Math.ceil(historyCount.value / pgSize.value)))
const currentPage = computed(() => Math.ceil(from.value / pgSize.value))
const displayedChanges = computed(() => changes.value)

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

const canRevert = (change) => ['edit', 'create', 'revert'].includes(change.type)

const rawLink = (change) => `/api/raw/${encodeURIComponent(change.page)}?rev=${change.rev}`

const pageLink = (linkFrom, linkTo) => ({
    path: `/history/${pagename.value}`,
    query: {
        from: linkFrom,
        to: linkTo,
    },
})

const actionI18nKeys = {
    edit: 'pages.history.edit',
    create: 'pages.history.create',
    move: 'pages.history.move',
    delete: 'pages.history.delete',
    protect: 'pages.history.protect',
}

const actionI18nLookup = type => actionI18nKeys[type] ?? `pages.history.${type}`

const compareRevisions = async () => {
    await navigateTo({
        path: `/diff/${pagename.value}`,
        query: {
            rev1: rev1.value || undefined,
            rev2: rev2.value || undefined,
        },
    })
}

useHeadSafe(computed(() => ({
    title: `${t('historyOf', { p: data.value?.title ?? pagename.value })} - ${config.public.appname}`,
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('error') })
        return
    }

    setPageHeader({
        title: data.value?.title ?? pagename.value,
        pagename: data.value?.pagename ?? pagename.value,
        isPage: true,
        pageMode: 'history',
    })
}

applyHeader()
watch([data, error, pagename], applyHeader)
</script>
