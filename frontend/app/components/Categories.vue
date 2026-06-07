<template>
    <div class="category">
        {{ $t('category') }}:
        <span v-if="categories.length === 0">{{ $t('none') }}</span>
        <template v-else>
            <span v-for="(cat, index) in categories" :key="index">
                <NuxtLink :to="`/category/${encodeURIComponent(cat.category)}`">{{ cat.category }}</NuxtLink><span
                    v-if="index < categories.length - 1"> | </span>
            </span>
        </template>
    </div>
</template>

<script setup>
defineProps({
    categories: {
        type: Array,
        required: true,
    },
})
</script>
