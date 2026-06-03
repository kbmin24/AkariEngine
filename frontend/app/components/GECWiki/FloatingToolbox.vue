<template>
    <div id="floatingToolbox" class="btn-group btn-group-lg" role="group">
        <button role="button" class="btn btn-primary" @click="scrollToTop">
            <i class="fa fa-arrow-up" aria-hidden="true"></i>
        </button>
        <button role="button" class="btn btn-primary" @click="scrollToBottom">
            <i class="fa fa-arrow-down" aria-hidden="true"></i>
        </button>
        <button role="button" class="btn btn-primary" @click="toggleToc">
            <i class="fa fa-bars" aria-hidden="true"></i>
        </button>
    </div>
</template>

<script setup>
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })

const toggleToc = () => {
    const toc = document.getElementById('toc')
    if (toc) toc.style.display = toc.style.display === 'none' ? '' : 'none'
}
</script>
