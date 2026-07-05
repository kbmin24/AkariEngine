<template>
    <div ref="el" class="cf-turnstile" :data-sitekey="siteKey"></div>
</template>
<script setup>
defineProps({
    siteKey: { type: String, default: null },
})

const el = ref(null)
let widgetId = null

onMounted(() => {
    if (window.turnstile) {
        widgetId = window.turnstile.render(el.value)
    }
})

defineExpose({
    reset() {
        if (window.turnstile && widgetId !== null) {
            window.turnstile.reset(widgetId)
        }
    }
})
</script>
