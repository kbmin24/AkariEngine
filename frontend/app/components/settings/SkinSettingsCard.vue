<template>
    <div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title">{{ $t('theme') }}</h5>
            <p class="card-text">{{ $t('theme_themeDesc') }}</p>

            <div v-if="success" class="alert alert-success" role="alert">{{ $t('done') }}</div>
            <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

            <form @submit.prevent="onSubmit">
                <div class="form-group mb-2">
                    <label for="skinSelect">{{ $t('theme_choose') }}</label>
                    <select id="skinSelect" v-model="selectedSkin" class="form-select"
                        :aria-label="$t('theme_choose_please')" required :disabled="pending">
                        <option v-for="skin in skins" :key="skin.name" :value="skin.name">
                            {{ skin.label }}
                        </option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="pending || !selectedSkin">
                    {{ $t('save') }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    skins: {
        type: Array,
        required: true,
    },
})

const { t } = useI18n()
const { csrfFetch } = useCsrf()
const { store, fetchMe } = useAuth()

const selectedSkin = ref(store.skin || props.skins[0]?.name || '')
const pending = ref(false)
const success = ref(false)
const errorMessage = ref('')

watch(() => store.skin, (skin) => {
    selectedSkin.value = skin || props.skins[0]?.name || ''
})

const onSubmit = async () => {
    success.value = false
    errorMessage.value = ''
    pending.value = true
    try {
        await csrfFetch('/api/settings/changeSkin', {
            method: 'POST',
            body: { skin: selectedSkin.value },
        })
        await fetchMe()
        success.value = true
    } catch (err) {
        errorMessage.value = err.data?.i18nKey ? t(err.data.i18nKey) : (err.data?.message || t('error'))
    } finally {
        pending.value = false
    }
}
</script>
