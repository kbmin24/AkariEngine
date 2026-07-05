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
        <form class="editForm" @submit.prevent="submitMove">
            <div class="form-group mt-2 mb-2 row">
                <label for="originalName" class="col-sm-2 col-form-label">{{ $t('move_orgpage') }}</label>
                <div class="col-sm-10">
                    <input id="originalName" class="form-control" maxlength="255" type="text"
                        :value="data?.originalName ?? pagename" :placeholder="$t('edit_max255')" disabled readonly>
                </div>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <label for="newName" class="col-sm-2 col-form-label">{{ $t('move_newpage') }}</label>
                <div class="col-sm-10">
                    <input id="newName" v-model.trim="newName" class="form-control" maxlength="255" type="text"
                        :placeholder="$t('edit_max255')" required autofocus>
                </div>
            </div>
            <div v-if="data?.captcha" class="mt-2 mb-2">
                <Turnstile :siteKey="data.captcha" />
            </div>
            <p v-if="!data?.username">
                <span class="text-danger fw-bold">{{ $t('warning') }}!</span>
                {{ $t('ipshown') }}
            </p>
            <button type="submit" class="btn btn-primary mt-3"
                :disabled="!moveButtonEnabled || newName.length === 0">
                {{ $t('move') }}
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

const newName = ref('')
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorMessage = ref('')
const moveButtonEnabled = ref(true)
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorMessage.value)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useAkariFetch(
    () => `/api/move/${pagename.value}`,
    {
        key: computed(() => `/move/${pagename.value}`),
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const originalName = computed(() => data.value?.originalName ?? pagename.value)
const headerTitle = computed(() => t('movepg', { name: originalName.value }))

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
        pagename: originalName.value,
        isPage: true,
        pageMode: 'move',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)

const submitMove = async () => {
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorMessage.value = ''
    moveButtonEnabled.value = false
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''

    try {
        const result = await csrfFetch(`/api/move/${pagename.value}`, {
            method: 'POST',
            body: {
                newName: newName.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        await navigateTo(result.redirect ?? `/w/${newName.value}`)
    } catch (e) {
        submitErrorKey.value = e?.data?.i18nKey || null
        submitErrorParams.value = e?.data?.i18nParams ?? {}
        submitErrorMessage.value = e?.data?.i18nKey ? '' : (e?.data?.message ?? t('error'))
    } finally {
        moveButtonEnabled.value = true
    }
}
</script>
