<template>
    <div v-if="isError" class="p-3">
        <p v-html="$t(errorI18nKey, errorI18nParams)"></p>
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else-if="isDone" class="p-3">
        <i18n-t keypath="pages.purge.done" tag="p">
            <template #link>
                <NuxtLink :to="'/'">{{ $t('pages.purge.done_desc') }}</NuxtLink>
            </template>
        </i18n-t>
    </div>
    <div v-else>
        <div v-if="submitError" class="alert alert-danger" role="alert">
            {{ $t(submitError) }}
        </div>
        <div class="editForm">
            <div class="form-group mt-2 mb-2 row">
                <label for="comment" class="col-sm-2 col-form-label">{{ $t('pages.purge.summary') }}</label>
                <div class="col-sm-10">
                    <input id="comment" v-model="comment" class="form-control" maxlength="255" type="text"
                        :placeholder="$t('pages.purge.max255')">
                </div>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <Turnstile :siteKey="data.captcha" />
                </div>
            </div>
            <button type="button" class="btn btn-primary mt-3" @click="showPurgeModal = true">
                {{ $t('pages.purge.submit') }}
            </button>
        </div>
    </div>

    <Teleport to="body">
        <div v-if="showPurgeModal">
            <div class="modal-backdrop fade show"></div>
            <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-labelledby="purgeConfirmModalLabel"
                aria-modal="true" @click.self="showPurgeModal = false">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="purgeConfirmModalLabel">
                                {{ $t('pages.purge.modal.title') }}
                            </h1>
                            <button type="button" class="btn-close" aria-label="Close"
                                @click="showPurgeModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <p>
                                {{ $t('pages.purge.modal.warning2') }}
                                <span class="warning-text">{{ $t('pages.purge.modal.warning1') }}</span>
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="showPurgeModal = false">
                                {{ $t('pages.purge.modal.no') }}
                            </button>
                            <button type="button" class="btn btn-danger" @click="submitPurge"
                                :disabled="!purgeButtonEnabled">
                                {{ $t('pages.purge.modal.yes') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.warning-text {
    color: var(--bs-danger);
    font-weight: bold;
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
const { csrfFetch } = useCsrf()

const comment = ref('')
const submitError = ref(null)
const purgeButtonEnabled = ref(true)
const showPurgeModal = ref(false)
const isDone = ref(false)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/purge/${pagename.value}`,
    {
        key: computed(() => `/purge/${pagename.value}`),
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const pageTitle = computed(() => data.value?.title ?? pagename.value)
const headerTitle = computed(() => `${t('pages.purge.title', { name: pageTitle.value })}`)

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
        pageMode: 'purge',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)

const submitPurge = async () => {
    submitError.value = null
    purgeButtonEnabled.value = false
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''
    try {
        await csrfFetch(`/api/purge/${pagename.value}`, {
            method: 'POST',
            body: {
                comment: comment.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        showPurgeModal.value = false
        isDone.value = true
        await navigateTo(`/w/${pagename.value}`)
    } catch (e) {
        showPurgeModal.value = false
        submitError.value = e?.data?.i18nKey || 'error'
    } finally {
        purgeButtonEnabled.value = true
    }
}
</script>
