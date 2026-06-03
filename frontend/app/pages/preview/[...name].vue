<template>
    <div v-if="error" class="p-3">
        <p v-html="$t(errorI18nKey)"></p>
    </div>
    <div v-else>
        <div class="alert alert-warning m-3" role="alert">
            {{ $t('previewWarning') }}
        </div>
        <div v-html="data?.content ?? ''"></div>
    </div>
</template>

<style>
@import url("@/assets/css/ren.css");
</style>

<script setup>
definePageMeta({
    layout: 'gec-wiki',
})

const route = useRoute()
const { setPageHeader } = usePageHeader()
const config = useRuntimeConfig()
const { csrfFetch } = useCsrf()

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const storedContent = import.meta.client
    ? sessionStorage.getItem(`preview:${pagename.value}`)
    : null

const error = ref(null)
const data = ref(null)

if (storedContent) {
    try {
        data.value = await csrfFetch('/api/preview', {
            method: 'POST',
            body: { title: pagename.value, content: storedContent },
        })
    } catch (e) {
        error.value = e
    }
} else {
    error.value = { data: { i18nKey: 'error' } }
}

const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? 'error')

useHead({
    title: `Preview: ${data.value?.title ?? pagename.value} - ${config.public.appname}`,
})

setPageHeader({ title: `Preview: ${data.value?.title ?? pagename.value}` })
</script>
