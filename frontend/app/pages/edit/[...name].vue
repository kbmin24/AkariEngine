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
        <div v-if="data?.prefix || data?.suffix" class="alert alert-info" role="alert">
            {{ $t('edit_part') }}
        </div>
        <div v-if="notification" class="alert alert-danger" role="alert">
            <LocalizedMessage :keypath="notificationI18nKey" :params="notificationI18nParams"
                :message="notificationMessage" />
        </div>
        <div v-if="submitError" class="alert alert-danger" role="alert">
            <LocalizedMessage :keypath="submitError" :params="submitErrorParams" />
        </div>
        <form @submit.prevent="submitEdit">
            <div class="form-group">
                <ul class="nav nav-tabs" id="editTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" :class="{ active: activeTab === 'edit' }" @click="setActiveTab('edit')"
                            id="edit-tab" type="button" role="tab">{{ $t('edit') }}</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" :class="{ active: activeTab === 'preview' }"
                            @click="setActiveTab('preview')" id="preview-tab" type="button" role="tab">{{ $t('preview')
                            }}</button>
                    </li>
                </ul>
                <div class="tab-content border border-top-0 px-2 py-3" id="tabContent">
                    <!-- main edit tab-->
                    <div class="tab-pane fade" :class="{ 'show active': activeTab === 'edit' }" id="edit-tab-pane"
                        role="tabpanel" tabindex="0">
                        <textarea ref="editArea" v-model="content" class="form-control" id="editAreaBox"
                            :placeholder="`Describe ${pagename} here...`" :disabled="data?.disabled"></textarea>
                    </div>
                    <!-- preview tab -->
                    <div class="tab-pane fade" :class="{ 'show active': activeTab === 'preview' }" id="preview-tab-pane"
                        role="tabpanel" tabindex="0">
                        <div v-if="previewLoading" class="d-flex justify-content-center">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <div v-else-if="previewError" class="alert alert-danger" role="alert">
                            {{ t('previewDataLoadError') }}
                        </div>
                        <div v-else>
                            <Categories v-if="showCategory" :categories />
                            <div v-html="previewData?.content"></div>
                        </div>
                    </div>
                </div>
            </div>
            <template v-if="!data?.disabled">
                <div class="form-group mt-2 mb-2 row">
                    <label for="comment" class="col-sm-2 col-form-label">{{ $t('summary') }}</label>
                    <div class="col-sm-10">
                        <input v-model="comment" class="form-control" id="comment" maxlength="255" type="text"
                            :placeholder="$t('edit_max255')">
                    </div>
                </div>
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <Turnstile :siteKey="data.captcha" />
                </div>
                <p v-if="!userStore.isLoggedIn">
                    <span class="text-danger fw-bold">{{ $t('warning') }}!</span> {{ $t('ipshown') }}
                </p>
                <p>
                    <span class="text-danger fw-bold">{{ $t('warning') }}!</span>
                    {{ $t('copyrightNotice', { appname: config.public.appname, license: config.public.licence }) }}
                </p>
                <button type="submit" class="btn btn-primary mt-3" :disabled="!saveButtonEnabled">
                    {{ $t('save') }}
                </button>
            </template>
        </form>
    </div>
</template>

<style scoped>
.editForm {
    height: 30rem;
    display: inline;
}

#editAreaBox {
    height: 25rem;
}

#editTab {
    margin: 0;
}

#editTab li {
    margin: 0;
}

#preview-tab-pane {
    height: 30rem;
    overflow-y: scroll;
}

</style>

<script setup>
definePageMeta({
    key: route => route.path,
})

// init'ise
const route = useRoute()
const { setPageHeader } = usePageHeader()
const config = useRuntimeConfig()
const { csrfFetch } = useCsrf()
const { store: userStore } = useAuth()
const { t } = useI18n()

const editArea = ref(null)
const content = ref('')
const comment = ref('')
const savedFormState = ref({ content: '', comment: '' })
const allowNavigationWithoutWarning = ref(false)
const submitError = ref(null)
const submitErrorParams = ref({})

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useAkariFetch(
    () => `/api/edit/${pagename.value}`,
    {
        key: `/edit/${pagename.value}`,
        query: {
            section: computed(() => route.query.section || undefined),
        },
    }
)

watch(data, (val) => {
    if (val?.content !== undefined) {
        content.value = val.content
        comment.value = ''
        savedFormState.value = { content: val.content, comment: '' }
        allowNavigationWithoutWarning.value = false
    }
}, { immediate: true })

const hasUnsavedChanges = computed(() => !data.value?.disabled && (
    content.value !== savedFormState.value.content ||
    comment.value !== savedFormState.value.comment
))

const warnBeforeUnload = (event) => {
    if (!hasUnsavedChanges.value || allowNavigationWithoutWarning.value) return

    event.preventDefault()
    event.returnValue = ''
}

onMounted(() => {
    window.addEventListener('beforeunload', warnBeforeUnload)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', warnBeforeUnload)
})

onBeforeRouteLeave(() => {
    if (!hasUnsavedChanges.value || allowNavigationWithoutWarning.value) return true

    return window.confirm(t('unsavedChangesWarning'))
})

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})
const notification = computed(() => data.value?.notification)
const notificationI18nKey = computed(() => {
    const details = notification.value
    return details && typeof details === 'object' ? details.i18nKey || null : null
})
const notificationI18nParams = computed(() => {
    const details = notification.value
    return details && typeof details === 'object' ? details.i18nParams ?? {} : {}
})
const notificationMessage = computed(() => {
    const details = notification.value
    if (!details) return ''
    if (typeof details === 'string') return details
    return details.i18nKey ? '' : details.message ?? ''
})
useHeadSafe(computed(() => ({
    title: `${t('edit_pg', { name: data.value?.title ?? pagename.value })} - ${config.public.appname}`,
})))

setPageHeader({ title: t('edit_pg', { name: pagename.value }),
    isPage: true,
    pagename: pagename.value,
    pageMode: 'edit',
 })
watch([data, pagename], () => {
    setPageHeader({ title: t('edit_pg', { name: data.value?.title ?? pagename.value }),
    isPage: true,
    pagename: pagename.value,
    pageMode: 'edit'
})
})

// preview
const activeTab = ref('edit')
const previewLoading = ref(true)
const previewData = ref(null)
const showCategory = computed(() => previewData.value?.showCategory ?? true)
const categories = computed(() => previewData.value?.categories ?? [])
const previewError = ref(null)

const setActiveTab = async (tab) => {
    activeTab.value = tab

    if (tab === 'preview') {
        previewLoading.value = true
        try {
            previewData.value = await csrfFetch('/api/preview', {
                method: 'POST',
                body: { title: pagename.value, content: content.value },
            })
            previewError.value = null
        } catch (e) {
            previewError.value = e
        } finally {
            previewLoading.value = false
        }
    }
}

const saveButtonEnabled = ref(true)
// save changes
const submitEdit = async () => {
    submitError.value = null
    const captchaResponse = document.querySelector('[name="cf-turnstile-response"]')?.value ?? ''
    saveButtonEnabled.value = false
    try {
        const result = await csrfFetch(`/api/edit/${pagename.value}`, {
            method: 'POST',
            body: {
                content: content.value,
                editPrefix: data.value?.prefix || '',
                editSuffix: data.value?.suffix || '',
                comment: comment.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        savedFormState.value = { content: content.value, comment: comment.value }
        if (result?.redirect) {
            allowNavigationWithoutWarning.value = true
            await navigateTo(result.redirect)
        }
    } catch (e) {
        submitError.value = e?.data?.i18nKey || 'error'
        submitErrorParams.value = e?.data?.i18nParams || {}
    } finally {
        saveButtonEnabled.value = true
    }
}
</script>
