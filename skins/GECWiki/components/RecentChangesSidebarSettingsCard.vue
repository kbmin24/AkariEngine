<template>
    <div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title">{{ $t('useRCBar') }}</h5>
            <p class="card-text">{{ $t('useRCBar_Desc') }}</p>

            <div v-if="success" class="alert alert-success" role="alert">{{ $t('done') }}</div>

            <div class="form-group mb-2">
                <div class="row">
                    <div class="form-check">
                        <input id="radioRCtrue" v-model="selected" class="form-check-input" type="radio"
                            name="radioRC" :value="true">
                        <label class="form-check-label" for="radioRCtrue">
                            {{ $t('use') }}
                        </label>
                    </div>
                    <div class="form-check">
                        <input id="radioRCfalse" v-model="selected" class="form-check-input" type="radio"
                            name="radioRC" :value="false">
                        <label class="form-check-label" for="radioRCfalse">
                            {{ $t('dontuse') }}
                        </label>
                    </div>
                </div>
            </div>
            <button class="btn btn-primary" type="button" @click="onSave">{{ $t('save') }}</button>
        </div>
    </div>
</template>

<script setup>
import { useRcSidebarSetting } from '../composables/useRcSidebarSetting.js'

const { value: enabled, load, save } = useRcSidebarSetting()

const selected = ref(true)
const success = ref(false)

onMounted(() => {
    selected.value = load()
})

watch(enabled, (value) => {
    selected.value = value
})

const onSave = () => {
    save(selected.value)
    success.value = true
}
</script>
