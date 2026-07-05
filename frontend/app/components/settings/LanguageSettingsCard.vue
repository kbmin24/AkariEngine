<template>
    <div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title">{{ $t('language') }}</h5>
            <p class="card-text">{{ $t('language_desc') }}</p>

            <div v-if="success" class="alert alert-success" role="alert">{{ $t('done') }}</div>

            <div class="form-group mb-2">
                <label for="languageSelect">{{ $t('language_choose') }}</label>
                <select id="languageSelect" class="form-select"
                    v-model="selectedLocale" :aria-label="$t('language_choose')" @change="onChange">
                    <option v-for="loc in locales" :key="loc.code"
                        :value="loc.code">
                        {{ loc.name }}
                    </option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup>
const { t, locale, locales, setLocale } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const success = ref(false)
const selectedLocale = ref(locale.value)
const settingsTitle = computed(() => t('settings'))
let successTimer = null

useHeadSafe(computed(() => ({
    title: `${settingsTitle.value} - ${config.public.appname}`,
})))

watch(locale, (value) => {
    selectedLocale.value = value
})

watch(settingsTitle, (title) => {
    setPageHeader({ title })
}, { immediate: true })

const onChange = async () => {
    success.value = false
    await setLocale(selectedLocale.value)
    success.value = true

    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => {
        success.value = false
    }, 2000)
}

onBeforeUnmount(() => {
    if (successTimer) clearTimeout(successTimer)
})
</script>
