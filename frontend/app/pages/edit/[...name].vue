<template>
    <div v-if="isError" class="p-3">
        <p v-html="$t(errorI18nKey)"></p>
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else class="p-3">
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
                            <li><NuxtLink class="dropdown-item" to="/Upload" target="_blank">{{ $t('upload') }}</NuxtLink></li>
                            <li><a class="dropdown-item" href="#"
                                    @click.prevent="editMacro('[file(', 'filename.jpg', ')]')">{{ $t('insert') }}</a>
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
            <template v-if="!data?.disabled">
                <div class="form-group mt-2 mb-2 row">
                    <label for="comment" class="col-sm-2 col-form-label">{{ $t('summary') }}</label>
                    <div class="col-sm-10">
                        <input v-model="comment" class="form-control" id="comment" maxlength="255" type="text"
                            :placeholder="$t('edit_max255')">
                    </div>
                </div>
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <div class="captcha" v-html="data.captcha"></div>
                </div>
                <p v-if="!userStore.isLoggedIn">
                    <span class="text-danger fw-bold">{{ $t('warning') }}!</span> {{ $t('ipshown') }}
                </p>
                <p>
                    <span class="text-danger fw-bold">{{ $t('warning') }}!</span>
                    {{ $t('copyrightNotice', { appname: config.public.appname, license: config.public.licence }) }}
                </p>
                <button type="submit" class="btn btn-primary mt-3">{{ $t('save') }}</button>
                <button type="button" class="btn btn-secondary mt-3" @click="previewButtonClick">{{ $t('preview')
                    }}</button>
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
</style>

<script setup>
definePageMeta({
    layout: 'gec-wiki',
    key: route => route.path,
})

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
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'error')
const notification = computed(() => data.value?.notification)
useHead(computed(() => ({
    title: `${t('edit_pg', { name: data.value?.title ?? pagename.value })} - ${config.public.appname}`,
})))

setPageHeader({ title: t('edit_pg', { name: pagename.value }) })
watch([data, pagename], () => {
    setPageHeader({ title: t('edit_pg', { name: data.value?.title ?? pagename.value }) })
})

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

const previewButtonClick = () => {
    const title = data.value?.title || pagename.value
    sessionStorage.setItem(`preview:${title}`, content.value)
    window.open(`/preview/${title}`, '_blank')
}

const submitEdit = async () => {
    submitError.value = null
    const captchaResponse = document.querySelector('[name="g-recaptcha-response"]')?.value ?? ''
    try {
        const result = await csrfFetch(`/api/edit/${pagename.value}`, {
            method: 'POST',
            body: {
                content: content.value,
                editPrefix: data.value?.prefix || '',
                editSuffix: data.value?.suffix || '',
                comment: comment.value,
                'g-recaptcha-response': captchaResponse,
            },
        })
        if (result?.redirect) await navigateTo(result.redirect)
    } catch (e) {
        submitError.value = e?.data?.i18nKey || 'error'
    }
}
</script>
