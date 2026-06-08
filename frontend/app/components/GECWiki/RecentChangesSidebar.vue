<template>
    <div id="rcsidebar">
        <div class="border rounded bg-white">
            <div class="p-2 border-bottom">
                <NuxtLink to="/RecentChanges">
                    <span class="fw-bold rcTitle"><i class="fa-solid fa-arrows-rotate"></i> {{ $t('recentChanges') }}</span>
                </NuxtLink>
            </div>
            <ul class="list-group list-group-flush" id="rcsidebarcontents">
                <li v-for="change in changes" :key="change.page + change.createdAt"
                    class="list-group-item text-truncate">
                    {{ formatChangeDate(change.createdAt) }}
                    <NuxtLink :to="`/w/${change.page}`">{{ change.page }}</NuxtLink>
                    <Template v-if="change.type === 'delete'"> ({{ $t('delete') }})</Template>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
#rcsidebarcontents li {
    background-color: #fff;
}
</style>

<script setup>
const { t, locale } = useI18n()

function formatChangeDate(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate()
    if (isToday) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return t('monthDay', {
        monthNum: String(d.getMonth() + 1).padStart(2, '0'),
        monthShort: d.toLocaleDateString(locale.value, { month: 'short' }),
        day: String(d.getDate()).padStart(2, '0'),
    })
}

const { data, refresh } = useFetch('/api/recentchanges', {
    default: () => ([]),
    query: {
        show: 10,
        isunique: true,
        excludefile: true,
        editonly: true
    },
})

const changes = computed(() => (data.value ?? []).slice(0, 10))

onMounted(() => {
    const interval = setInterval(refresh, 15000)
    onBeforeUnmount(() => clearInterval(interval))
})
</script>
