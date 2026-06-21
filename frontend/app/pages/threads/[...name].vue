<template>
    <div v-if="isError" class="p-3">
        <p v-html="$t(errorI18nKey, errorI18nParams)"></p>
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else>
        <section>
            <h3>{{ $t('pages.threads.open') }}</h3>
            <ul v-if="openThreads.length > 0">
                <li v-for="thread in openThreads" :key="thread.threadID">
                    <NuxtLink :to="`/thread/${thread.threadID}`">{{ thread.threadTitle }}</NuxtLink>
                </li>
            </ul>
            <p v-else class="text-secondary">{{ $t('pages.threads.none') }}</p>
        </section>

        <hr>

        <section>
            <h3>{{ $t('pages.threads.closed') }}</h3>
            <ul v-if="closedThreads.length > 0">
                <li v-for="thread in closedThreads" :key="thread.threadID">
                    <NuxtLink :to="`/thread/${thread.threadID}`">{{ thread.threadTitle }}</NuxtLink>
                </li>
            </ul>
            <p v-else class="text-secondary">{{ $t('pages.threads.none') }}</p>
        </section>

        <hr>

        <section>
            <h3>{{ $t('pages.threads.create') }}</h3>
            <div v-if="submitError" class="alert alert-danger" role="alert">
                {{ submitError }}
            </div>
            <form @submit.prevent="submitThread">
                <div class="form-group mt-2 mb-2 row">
                    <label for="title" class="col-sm-2 col-form-label">{{ $t('pages.threads.title') }}</label>
                    <div class="col-sm-10">
                        <input id="title" v-model.trim="title" class="form-control" maxlength="255" type="text"
                            :placeholder="$t('pages.threads.titlePlaceholder')" required>
                    </div>
                </div>
                <textarea id="comment" v-model="comment" class="form-control"
                    :placeholder="$t('pages.threads.commentPlaceholder')"></textarea>
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <Turnstile :site-key="data.captcha" />
                </div>
                <button type="submit" class="btn btn-primary mt-3" :disabled="submitting || title.length === 0">
                    {{ $t('pages.threads.submit') }}
                </button>
            </form>
        </section>
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
const { csrfFetch } = useCsrf()

const title = ref('')
const comment = ref('')
const submitError = ref(null)
const submitting = ref(false)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(part => part !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/threads/${pagename.value}`,
    {
        key: computed(() => `/threads/${pagename.value}`),
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const pageTitle = computed(() => data.value?.pagename ?? pagename.value)
const openThreads = computed(() => data.value?.openThreads ?? [])
const closedThreads = computed(() => data.value?.closedThreads ?? [])
const headerTitle = computed(() => t('threadOf', { page: pageTitle.value }))

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
        pagename: pageTitle.value,
        isPage: true,
        pageMode: 'threads',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)

const submitThread = async () => {
    submitError.value = null
    submitting.value = true
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''

    try {
        const result = await csrfFetch(`/api/threads/${pagename.value}`, {
            method: 'POST',
            body: {
                title: title.value,
                comment: comment.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        await navigateTo(result.redirect ?? `/thread/${result.threadID}`)
    } catch (e) {
        submitError.value = e?.data?.i18nKey
            ? t(e.data.i18nKey, e.data.i18nParams ?? {})
            : (e?.data?.message ?? t('error'))
    } finally {
        submitting.value = false
    }
}
</script>
