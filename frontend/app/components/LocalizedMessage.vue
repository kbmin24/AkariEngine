<template>
    <i18n-t v-if="keypath" :keypath="keypath" :tag="tag">
        <template v-for="name in paramNames" :key="name" #[name]>
            {{ normalizedParams[name] }}
        </template>
    </i18n-t>
    <component :is="tag" v-else>
        {{ normalizedMessage }}
    </component>
</template>

<script setup>
const props = defineProps({
    keypath: {
        type: String,
        default: '',
    },
    params: {
        type: Object,
        default: () => ({}),
    },
    tag: {
        type: String,
        default: 'span',
    },
    message: {
        type: String,
        default: '',
    },
})

const normalizeParam = value => String(value ?? '').replace(/&#x2F;/gi, '/')

const normalizedParams = computed(() => Object.fromEntries(
    Object.entries(props.params ?? {}).map(([key, value]) => [key, normalizeParam(value)])
))
const paramNames = computed(() => Object.keys(normalizedParams.value))
const normalizedMessage = computed(() => normalizeParam(props.message))
</script>
