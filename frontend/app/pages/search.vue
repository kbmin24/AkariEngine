<template>
    <div class="p-3">
        <p class="fw-bold">
            <i18n-t keypath="lookingForPageEdit" tag="span">
                <template #link>
                    <NuxtLink :to="editLink">{{ $t('lookingForPageEditLink') }}</NuxtLink>
                </template>
            </i18n-t>
        </p>

        <h5>{{ $t('titleMatch') }}</h5>
        <ul class="list-group list-group-flush">
            <li v-for="item in data?.resultTitle" :key="item.title" class="list-group-item">
                <NuxtLink :to="`/w/${item.title}`">{{ item.title }}</NuxtLink>
            </li>
        </ul>
        <p v-if="!data?.resultTitle?.length">{{ $t('noResults') }}</p>

        <br>

        <h5>{{ $t('contentMatch') }}</h5>
        <ul class="list-group list-group-flush">
            <li v-for="item in data?.resultContent" :key="item.title" class="list-group-item">
                <NuxtLink :to="`/w/${item.title}`">{{ item.title }}</NuxtLink>
                <p v-if="data?.searchMode === 'enhanced' && item.snippet"
                    class="hitCroppedContent" v-html="item.snippet"></p>
            </li>
        </ul>
        <p v-if="!data?.resultContent?.length">{{ $t('noResults') }}</p>

        <br>

        <ul class="pagination">
            <li v-if="from > 0" class="page-item">
                <NuxtLink class="page-link" :to="pageLink(Math.max(0, from - 10))">
                    {{ $t('previous') }}
                </NuxtLink>
            </li>
            <li v-if="hasNextPage" class="page-item">
                <NuxtLink class="page-link" :to="pageLink(from + 10)">
                    {{ $t('next') }}
                </NuxtLink>
            </li>
        </ul>
    </div>
</template>

<script setup>
const route = useRoute()
const { setPageHeader } = usePageHeader()
const config = useRuntimeConfig()
const { t } = useI18n()

const q = computed(() => route.query.q ?? '')
const from = computed(() => Number(route.query.from ?? 0))
const encodedQuery = computed(() => encodeURIComponent(q.value))
const editLink = computed(() => `/edit/${encodedQuery.value}`)

useHeadSafe(computed(() => ({
    title: `${t('searchResults', { q: q.value })} - ${config.public.appname}`,
})))

const headerTitle = computed(() => t('searchResults', { q: q.value }))
setPageHeader({ title: headerTitle.value })
watch(headerTitle, (val) => setPageHeader({ title: val }))

const { data } = await useAkariFetch('/api/search', {
    key: 'search',
    query: computed(() => ({ q: q.value, from: from.value })),
    watch: [q, from],
})

const hasNextPage = computed(() => !!data.value?.hasMore)

const pageLink = (newFrom) => ({
    path: '/search',
    query: { q: q.value, from: newFrom },
})
</script>
