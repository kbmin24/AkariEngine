<template>
    <div id="floatingToolbox" class="btn-group btn-group-lg" role="group">
        <button role="button" class="btn btn-primary" @click="scrollToTop">
            <i class="fas fa-arrow-up" aria-hidden="true"></i>
        </button>
        <button role="button" class="btn btn-primary" @click="scrollToBottom">
            <i class="fas fa-arrow-down" aria-hidden="true"></i>
        </button>
        <button v-if="hasToc" role="button" class="btn btn-primary" @click="scrollToToc">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
    </div>
</template>

<style scoped>
#floatingToolbox :first-child {
    border-bottom-left-radius: 0;
}
#floatingToolbox :last-child {
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
}
</style>

<script setup>
const route = useRoute()

const hasToc = ref(false)
let tocObserver = null

const updateTocVisibility = () => {
    hasToc.value = !!document.getElementById('toc')
}

onMounted(() => {
    updateTocVisibility()
    tocObserver = new MutationObserver(updateTocVisibility)
    tocObserver.observe(document.body, { childList: true, subtree: true })
})

onBeforeUnmount(() => {
    tocObserver?.disconnect()
})

watch(
    () => route.fullPath,
    async () => {
        await nextTick()
        updateTocVisibility()
    }
)

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })

const scrollToToc = () => {
    const tocElement = document.getElementById('toc')
    if (tocElement) {
        tocElement.scrollIntoView({ behavior: 'smooth' })
    }
}
</script>
