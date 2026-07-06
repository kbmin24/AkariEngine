<template>
    <span v-if="hasInfo" class="page-title-info">
        <span v-if="redirectFrom" class="page-title-info-item">
            <i18n-t keypath="page_redirectedfrom" tag="span">
                <template #page>
                    <NuxtLink :to="redirectFromLink">{{ redirectFrom }}</NuxtLink>
                </template>
            </i18n-t>
        </span>
        <span v-if="rev" class="page-title-info-item">(r{{ rev }})</span>
        <span v-if="isUserAdminPage" class="page-title-info-item">({{ $t('admin') }})</span>
    </span>
</template>

<script setup>
const props = defineProps({
    rev: {
        type: [Number, String],
        default: null,
    },
    redirectFrom: {
        type: String,
        default: null,
    },
    isUserAdminPage: {
        type: Boolean,
        default: false,
    },
})

const hasInfo = computed(() => !!(props.redirectFrom || props.rev || props.isUserAdminPage))
const redirectFromLink = computed(() => `/w/${props.redirectFrom.split('/').map(encodeURIComponent).join('/')}?redirect=true`)
</script>

<style scoped>
.page-title-info {
    display: inline;
}

.page-title-info-item + .page-title-info-item {
    margin-left: 0.35em;
}
</style>
