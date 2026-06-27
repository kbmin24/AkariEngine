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
            <LocalizedMessage :keypath="submitError" :params="submitErrorParams" />
        </div>
        <form class="editForm" @submit.prevent="submitDelete">
            <div class="form-group mt-2 mb-2 row">
                <label for="comment" class="col-sm-2 col-form-label">{{ $t('pages.delete.summary') }}</label>
                <div class="col-sm-10">
                    <input id="comment" v-model="comment" class="form-control" maxlength="255" type="text"
                        :placeholder="$t('pages.delete.max255')">
                </div>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <Turnstile :siteKey="data.captcha" />
                </div>
            </div>
            <button type="submit" class="btn btn-primary mt-3" :disabled="!deleteButtonEnabled">
                {{ $t('pages.delete.submit') }}
            </button>
        </form>
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

const comment = ref('')
const submitError = ref(null)
const submitErrorParams = ref({})
const deleteButtonEnabled = ref(true)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/delete/${pagename.value}`,
    {
        key: computed(() => `/delete/${pagename.value}`),
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const pageTitle = computed(() => data.value?.title ?? pagename.value)
const headerTitle = computed(() => `${t('pages.delete.title', { name: pageTitle.value })}`)

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
        pageMode: 'delete',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)

const submitDelete = async () => {
    submitError.value = null
    submitErrorParams.value = {}
    deleteButtonEnabled.value = false
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''
    try {
        await csrfFetch(`/api/delete/${pagename.value}`, {
            method: 'POST',
            body: {
                comment: comment.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        await navigateTo(`/w/${pagename.value}`)
    } catch (e) {
        submitError.value = e?.data?.i18nKey || 'error'
        submitErrorParams.value = e?.data?.i18nParams || {}
    } finally {
        deleteButtonEnabled.value = true
    }
}
</script>
