<template>
    <div v-if="isError" class="p-3">
        <template v-if="errorI18nKey === 'noUserPage_user'">
            <p>
                <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" />
                <NuxtLink :to="`/edit/${userPageEditLink}`">{{ $t('createUserPage') }}</NuxtLink>
            </p>
        </template>
        <template v-else-if="errorI18nKey === 'page404'">
            <template v-if="hasHistory">
                <p>{{ $t('page404') }}</p>
                <i18n-t keypath="pages.view.error.viewHistory" tag="p">
                    <template #link>
                        <NuxtLink :to="`/history/${pagename}`">{{ $t('pages.view.error.viewHistoryLinkDesc') }}</NuxtLink>
                    </template>
                </i18n-t>
            </template>
            <p v-else>
                {{ $t('page404') }}
                <i18n-t keypath="page_asknew" tag="span">
                    <template #link>
                        <NuxtLink :to="`/edit/${pagename}`">{{ $t('page_asknew_createNewOne') }}</NuxtLink>
                    </template>
                </i18n-t>
            </p>
        </template>
        <template v-else>
            <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" tag="p" />
        </template>

        <p>
            <i18n-t keypath="returnInfo" tag="p">
                <template #link>
                    <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
                </template>
            </i18n-t>
        </p>
    </div>
    <div v-else>
        <Categories v-if="showCategory" :categories="categories" />
        <div v-html="data.content" ref="articleRef"></div>
    </div>
</template>

<style>
@import url("@/assets/css/ren.css");
</style>

<script setup>
definePageMeta({
    key: route => route.path,
})

const route = useRoute()
const { setPageHeader } = usePageHeader()
const config = useRuntimeConfig()
const articleRef = ref(null)
useRouterContent(articleRef)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/w/${pagename.value}`,
    {
        key: `/w/${pagename.value}`,
        query: {
            rev: computed(() => route.query.rev || undefined),
            redirect: computed(() => route.query.redirect || undefined),
            from: computed(() => route.query.from || undefined),
        },
    }
)

usePostRender(articleRef, data)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'page404')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const hasHistory = computed(() => !!(error.value?.data?.hasHistory ?? data.value?.hasHistory))
const userPageEditLink = computed(() => `User:${pagename.value.split(':')[1] ?? pagename.value}`)
const isRedirect = computed(() => route.query.redirect === 'true')
const showCategory = computed(() => data.value?.showCategory ?? true)
const categories = computed(() => data.value?.categories ?? [])
const processRedirection = async (val) => {
    if (isRedirect.value) return
    if (val?.redirect) {
        await navigateTo({
            path: val.redirect,
            query: {
                redirect: 'true',
                from: pagename.value,
            }
        }, {
            replace: true,
        })
    }
}

if (data.value?.redirect) {
    await processRedirection(data.value)
}

useHeadSafe(computed(() => ({
    title: (data.value?.title ?? pagename.value) + ' - ' + config.public.appname,
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: $t("error") })
    } else if (data.value && !data.value.error && !error.value) {
        setPageHeader({
            title: data.value.title,
            pagename: data.value.pagename,
            titleInfo: data.value.titleInfo ?? null,
            isPage: true,
            pageMode: 'page',
            updatedAt: data.value.updatedAt ?? null,
        })
    } else {
        setPageHeader({ title: pagename.value })
    }
}

applyHeader()
watch([data, error, pagename], applyHeader)

watch(data, async (val) => {
    if (val?.redirect) await processRedirection(val)
})
</script>
