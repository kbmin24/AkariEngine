<template>
    <div v-if="satoboxVisible" class='alert alert-info' role="alert">
        <i18n-t keypath="userThread.isOpen" tag="span">
            <template #link>
                <NuxtLink :to="`/threads/User:${store.username}`" id="satoboxlink">{{ $t('userThread.userThread') }}
                </NuxtLink>
            </template>
        </i18n-t>
    </div>
</template>

<script setup>
const store = useUserStore()
const userThreadPage = computed(() => store.username ? `User:${store.username}` : null)

const satoboxUrl = computed(() => userThreadPage.value ? `/api/threads/${encodeURI(userThreadPage.value)}` : null)
const { data, error, pending } = await useAkariFetch(satoboxUrl, {
    default: () => null,
    immediate: Boolean(userThreadPage.value),
    server: false,
    watch: [userThreadPage],
})

const satoboxVisible = computed(() => (data.value?.openThreads ?? []).length > 0)
</script>
