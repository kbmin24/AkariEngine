<template>
    <div id="rcsidebar">
        <div class="border rounded">
            <div class="p-2 border-bottom bg-white">
                <NuxtLink to="/RecentChanges">
                    <span class="fw-bold rcTitle">최근 변경</span>
                </NuxtLink>
            </div>
            <ul class="list-group list-group-flush" id="rcsidebarcontents">
                <li v-for="change in changes" :key="change.page + change.createdAt"
                    class="list-group-item p-1 text-truncate">
                    <NuxtLink :to="`/w/${change.page}`">{{ change.page }}</NuxtLink>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
const { data } = useFetch('/api/RecentChanges', {
    default: () => ({ changes: [] }),
})

const changes = computed(() => (data.value?.changes ?? []).slice(0, 10))
</script>
