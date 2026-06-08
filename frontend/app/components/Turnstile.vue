<template>
    <div ref="el" class="cf-turnstile" :data-sitekey="siteKey"></div>
</template>
<script setup>
defineProps({
    siteKey: { type: String, default: null },
})

const el = ref(null)

onMounted(() => {
    if (window.turnstile) {
        window.turnstile.render(el.value)
    }
})
</script>
