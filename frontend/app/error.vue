<template>
    <div class="d-flex justify-content-center align-items-center vh-100">
        <div class="p-2 text-center">
            <h1 class="excl"><i class="fa-solid fa-circle-exclamation"></i></h1>
            <h1 class="errorcode">{{ error.statusCode }}</h1>
            <p v-if="error.statusCode === 404" class="text-secondary">{{ $t('errorPage.404Desc') }}</p>
            <p v-else-if="error.statusCode === 500" class="text-secondary">{{ $t('errorPage.500Desc') }}</p>
            <p v-else class="text-secondary">{{ $t('errorPage.otherDesc') }}</p>
            <NuxtLink to="/w/FrontPage">FrontPage</NuxtLink>
        </div>
    </div>
</template>

<style scoped>
.errorcode {
    font-size: 6rem;
    font-weight: bold;
}
.excl {
    font-size: 4rem;
    color: var(--bs-secondary);
}
</style>

<script setup>
const props = defineProps({
    error: {
        type: Object,
        required: true
    }
})
</script>