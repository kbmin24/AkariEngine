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
        <form @submit.prevent="submitUpload">
            <div class="form-group mt-2 mb-2 row">
                <label for="inputFile" class="col-sm-2 col-form-label">{{ $t('pages.upload.file') }}</label>
                <div class="col-sm-10">
                    <input id="inputFile" ref="fileInput" class="form-control" type="file"
                        :accept="acceptedFileTypes" :disabled="!uploadButtonEnabled" required
                        @change="onFileChange">
                    <small class="form-text text-muted">
                        {{ $t('pages.upload.fileHelp', { types: fileTypesText, limit: fileLimit }) }}
                    </small>
                </div>
            </div>
            <div class="form-group mt-2 mb-2">
                <figure class="figure">
                    <img v-if="previewUrl" class="figure-img rounded upload-image-preview" :src="previewUrl"
                        :alt="filename">
                    <div v-else class="rounded upload-image-preview upload-image-preview-empty"></div>
                    <figcaption class="figure-caption">{{ $t('preview') }}</figcaption>
                </figure>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <label for="filename" class="col-sm-2 col-form-label">{{ $t('pages.upload.filename') }}</label>
                <div class="col-sm-10">
                    <input id="filename" v-model.trim="filename" class="form-control" maxlength="255" type="text"
                        :placeholder="$t('pages.upload.filename')" :disabled="!uploadButtonEnabled" required>
                </div>
            </div>
            <div class="form-group mt-2 mb-2 row">
                <label for="explanation" class="col-sm-2 col-form-label">{{ $t('pages.upload.explanation') }}</label>
                <div class="col-sm-10">
                    <textarea id="explanation" v-model="explanation" class="form-control"
                        :placeholder="$t('pages.upload.explanation')" :disabled="!uploadButtonEnabled"></textarea>
                </div>
            </div>
            <div v-if="data?.captcha" class="mt-2 mb-2">
                <Turnstile :siteKey="data.captcha" />
            </div>
            <button type="submit" class="btn btn-primary mt-3" :disabled="!canSubmit">
                {{ $t('upload') }}
            </button>
        </form>
    </div>
</template>

<style scoped>
#explanation {
    min-height: 12rem;
}

.upload-image-preview {
    display: block;
    width: 25%;
    min-width: 10rem;
    max-width: 20rem;
    aspect-ratio: 4 / 3;
    object-fit: contain;
}

.upload-image-preview-empty {
    border: 1px solid var(--bs-border-color);
    background: var(--bs-secondary-bg);
}
</style>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const fileInput = ref(null)
const selectedFile = ref(null)
const previewUrl = ref('')
const filename = ref('')
const explanation = ref('')
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorMessage = ref('')
const uploadButtonEnabled = ref(true)
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorMessage.value)

const { data, error, pending } = await useAkariFetch('/api/Upload', {
    key: '/Upload',
})

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const fileTypes = computed(() => data.value?.filetypes ?? [])
const fileTypesText = computed(() => fileTypes.value.map(type => `.${type}`).join(', '))
const fileLimit = computed(() => data.value?.fileLimit ?? 4)
const acceptedFileTypes = computed(() => fileTypes.value.map(type => `.${type}`).join(','))
const canSubmit = computed(() => uploadButtonEnabled.value && selectedFile.value && filename.value.length > 0)

useHeadSafe(computed(() => ({
    title: `${t('upload')} - ${config.public.appname}`,
})))

const applyHeader = () => {
    setPageHeader({ title: isError.value ? t('error') : t('upload') })
}

applyHeader()
watch([data, error], applyHeader)

const onFileChange = (event) => {
    const file = event.target.files?.[0] ?? null
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    selectedFile.value = file
    previewUrl.value = file ? URL.createObjectURL(file) : ''
    filename.value = file?.name ?? ''
}

onBeforeUnmount(() => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const submitUpload = async () => {
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorMessage.value = ''

    if (!selectedFile.value) {
        submitErrorKey.value = 'pages.upload.fileRequired'
        return
    }

    uploadButtonEnabled.value = false
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''
    const body = new FormData()
    body.append('filename', filename.value)
    body.append('explanation', explanation.value)
    body.append('cf-turnstile-response', captchaResponse)
    body.append('inputFile', selectedFile.value)

    try {
        const result = await csrfFetch('/api/Upload', {
            method: 'POST',
            body,
        })
        await navigateTo(result.redirect ?? `/w/File:${filename.value}`)
    } catch (e) {
        submitErrorKey.value = e?.data?.i18nKey || null
        submitErrorParams.value = e?.data?.i18nParams ?? {}
        submitErrorMessage.value = e?.data?.i18nKey ? '' : (e?.data?.message ?? t('error'))
    } finally {
        uploadButtonEnabled.value = true
    }
}
</script>
