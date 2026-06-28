<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else>
        <div class="view-rank-table-wrap">
            <table v-if="rank.length > 0" class="table view-rank-table">
                <colgroup>
                    <col class="view-rank-rank-col">
                    <col class="view-rank-page-col">
                    <col class="view-rank-count-col">
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">{{ $t('pages.viewRank.rank') }}</th>
                        <th scope="col">{{ $t('pages.viewRank.page') }}</th>
                        <th scope="col">{{ $t('pages.viewRank.views') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(page, index) in rank" :key="page.title">
                        <th scope="row">{{ index + 1 }}</th>
                        <td class="view-rank-cell">
                            <NuxtLink :to="pageLink(page.title)">{{ page.title }}</NuxtLink>
                        </td>
                        <td>{{ formatCount(page.count) }}</td>
                    </tr>
                </tbody>
            </table>
            <p v-else class="text-secondary">{{ $t('pages.viewRank.noResults') }}</p>
        </div>
    </div>
</template>

<script setup>
const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const { data, error, pending } = await useFetch('/api/viewrank', {
    key: computed(() => `${route.path}:viewrank`),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.viewRank.dataLoadError')))

const rank = computed(() => Array.isArray(data.value?.rank) ? data.value.rank : [])

const pageLink = title => `/w/${title}`
const formatCount = count => new Intl.NumberFormat(locale.value).format(Number(count ?? 0))

useHeadSafe(computed(() => ({
    title: `${t('viewRank')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('viewRank'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.view-rank-table-wrap {
    overflow-x: auto;
}

.view-rank-table {
    min-width: 100%;
}

.view-rank-rank-col {
    width: 4rem;
}

.view-rank-page-col {
    min-width: 60%;
}

.view-rank-count-col {
    min-width: 8rem;
}

.view-rank-cell {
    overflow-wrap: anywhere;
}
</style>
