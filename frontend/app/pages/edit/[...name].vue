<template>
    <div v-if="isError" class="p-3">
        <p v-html="$t(errorI18nKey)"></p>
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
            {{ $t(notification) }}
        </div>
        <div v-if="submitError" class="alert alert-danger" role="alert">
            {{ $t(submitError) }}
        </div>
        <form @submit.prevent="submitEdit">
            <div class="form-group">
                <ul class="nav nav-tabs" id="myTab" role="tablist">
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
                        <div class="mb-2">
                            <div class="editMacro bg-light border" @click="editMacro(`'''`, $t('bold'), `'''`)">
                                <i class="fas fa-bold"></i>
                            </div>
                            <div class="editMacro bg-light border" @click="editMacro(`''`, $t('italic'), `''`)">
                                <i class="fas fa-italic"></i>
                            </div>
                            <div class="editMacro bg-light border" @click="editMacro('__', $t('underline'), '__')">
                                <i class="fas fa-underline"></i>
                            </div>
                            <div class="editMacro bg-light border" @click="editMacro('--', $t('strikethrough'), '--')">
                                <i class="fas fa-strikethrough"></i>
                            </div>
                            <div class="dropdown editMacro-drp">
                                <button class="editMacro-drp bg-light border dropdown-toggle" type="button"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-image"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li>
                                        <NuxtLink class="dropdown-item" to="/Upload" target="_blank">{{ $t('upload') }}
                                        </NuxtLink>
                                    </li>
                                    <li><a class="dropdown-item" href="#"
                                            @click.prevent="editMacro('[file(', 'filename.jpg', ')]')">{{ $t('insert')
                                            }}</a>
                                    </li>
                                </ul>
                            </div>
                            <div class="dropdown editMacro-drp">
                                <button class="editMacro-drp bg-light border dropdown-toggle" type="button"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-heading"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" @click.prevent="editMacro('', '', '[toc]')">{{
                                        $t('toc')
                                            }}</a></li>
                                    <li v-for="n in 6" :key="n">
                                        <a class="dropdown-item" href="#"
                                            @click.prevent="editMacro(`\n${'='.repeat(n)} `, $t('content'), ` ${'='.repeat(n)}\n`)">
                                            {{ $t('leveln', { level: n }) }}
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
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

.editMacro {
    display: inline-block;
    text-align: center;
    font-size: 1.5rem;
    width: 2rem;
    height: 2rem;
}

.editMacro-drp {
    display: inline-block;
    font-size: 1.5rem;
    height: 2rem;
    color: inherit;
}

.preview-tab-pane {
    height: 30rem;
}
</style>

<script setup>
definePageMeta({
    layout: 'gec-wiki',
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
const submitError = ref(null)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useFetch(
    () => `/api/edit/${pagename.value}`,
    {
        key: `/edit/${pagename.value}`,
        query: {
            section: computed(() => route.query.section || undefined),
        },
    }
)

watch(data, (val) => {
    if (val?.content !== undefined) content.value = val.content
}, { immediate: true })

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError')
const notification = computed(() => data.value?.notification)
useHead(computed(() => ({
    title: `${t('edit_pg', { name: data.value?.title ?? pagename.value })} - ${config.public.appname}`,
})))

setPageHeader({ title: t('edit_pg', { name: pagename.value }),
    isPage: true,
    pageMode: 'edit',
 })
watch([data, pagename], () => {
    setPageHeader({ title: t('edit_pg', { name: data.value?.title ?? pagename.value }),
    isPage: true,
    pageMode: 'edit'
})
})

// edit helper buttons
const editMacro = (before, placeholder, after) => {
    const textarea = editArea.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.value.substring(start, end)
    const text = selected || placeholder
    content.value = content.value.substring(0, start) + before + text + after + content.value.substring(end)
    nextTick(() => {
        textarea.selectionStart = start + before.length
        textarea.selectionEnd = start + before.length + text.length
        textarea.focus()
    })
}

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
        if (result?.redirect) await navigateTo(result.redirect)
    } catch (e) {
        submitError.value = e?.data?.i18nKey || 'error'
    } finally {
        saveButtonEnabled.value = true
    }
}
</script>
