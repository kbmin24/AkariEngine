<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const { data, error, pending } = await useAkariFetch('/api/RandomPage', {
    key: '/RandomPage',
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error || !data.value?.redirect))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('dataLoadError')))

useHeadSafe(computed(() => ({
    title: `${t('randomPage')} - ${config.public.appname}`,
})))

setPageHeader({
    title: isError.value ? t('error') : t('randomPage'),
})

if (!isError.value) {
    await navigateTo(data.value.redirect)
}
</script>
