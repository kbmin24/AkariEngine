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
        <div v-if="submitError" class="alert alert-danger" role="alert">
            <LocalizedMessage :keypath="submitErrorKey" :params="submitErrorParams" :message="submitErrorMessage" />
        </div>
        <form class="editForm" @submit.prevent="submitRevert">
            <div class="form-group mt-2 mb-2 row">
                <label for="revision" class="col-sm-2 col-form-label">{{ $t('revision') }}</label>
                <div class="col-sm-10">
                    <input id="revision" class="form-control" type="text" :value="`r${targetRevision}`" disabled readonly>
                </div>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <label for="comment" class="col-sm-2 col-form-label">{{ $t('summary') }}</label>
                <div class="col-sm-10">
                    <input id="comment" v-model="comment" class="form-control" maxlength="230" type="text"
                        :placeholder="$t('pages.revert.max230')">
                </div>
            </div>
            <p v-if="!data?.username">
                <span class="text-danger fw-bold">{{ $t('warning') }}!</span>
                {{ $t('ipshown') }}
            </p>
            <div v-if="data?.captcha" class="mt-2 mb-2">
                <Turnstile :siteKey="data.captcha" />
            </div>
            <button type="submit" class="btn btn-primary mt-3" :disabled="!revertButtonEnabled">
                {{ $t('revert') }}
            </button>
        </form>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const comment = ref('')
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorMessage = ref('')
const revertButtonEnabled = ref(true)
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorMessage.value)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const revision = computed(() => Number(route.query.rev))

const { data, error, pending } = await useFetch(
    () => `/api/revert/${pagename.value}`,
    {
        key: computed(() => `/revert/${pagename.value}:${route.query.rev ?? ''}`),
        query: {
            rev: computed(() => route.query.rev || undefined),
        },
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const targetRevision = computed(() => Number(data.value?.rev ?? revision.value))
const headerTitle = computed(() => t('pages.revert.title', {
    name: data.value?.pagename ?? pagename.value,
    rev: targetRevision.value,
}))

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
        pagename: data.value?.pagename ?? pagename.value,
        isPage: true,
        pageMode: 'revert',
    })
}

applyHeader()
watch([data, error, pagename, targetRevision, headerTitle], applyHeader)

const submitRevert = async () => {
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorMessage.value = ''
    revertButtonEnabled.value = false
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''

    try {
        const result = await csrfFetch(`/api/revert/${pagename.value}`, {
            method: 'POST',
            body: {
                rev: targetRevision.value,
                comment: comment.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        await navigateTo(result.redirect ?? `/w/${pagename.value}`)
    } catch (e) {
        submitErrorKey.value = e?.data?.i18nKey || null
        submitErrorParams.value = e?.data?.i18nParams ?? {}
        submitErrorMessage.value = e?.data?.i18nKey ? '' : (e?.data?.message ?? t('error'))
    } finally {
        revertButtonEnabled.value = true
    }
}
</script>
