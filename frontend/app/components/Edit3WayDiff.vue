<template>
    <table class="conflictContainer border mb-2">
        <template v-for="(chunk, index) in displayChunks" :key="index">
            <template v-if="chunk.type === 'merged'">
                <tr>
                    <td>{{ $t('pages.edit.conflictView.base') }} (r{{ baseRev }})</td>
                    <td class="originalLine diffContent">{{ chunk.base }}</td>
                </tr>
                <tr>
                    <td>{{ mergedSourceLabel(chunk) }}</td>
                    <td class="diffContent" :class="mergedLineClass(chunk)">{{ chunk.content }}</td>
                </tr>
            </template>
            <template v-else-if="chunk.type === 'conflict'">
                <tr class="conflictHeading">
                    <td></td>
                    <td>{{ $t('pages.edit.conflictView.conflictN', { n: chunk.conflictNumber }) }}</td>
                </tr>
                <tr>
                    <td>{{ $t('pages.edit.conflictView.base') }} (r{{ baseRev }})</td>
                    <td class="originalLine diffContent">{{ chunk.base }}</td>
                </tr>
                <tr>
                    <td>r{{ conflictRev }}</td>
                    <td class="remoteLine diffContent">{{ chunk.editA }}</td>
                </tr>
                <tr>
                    <td>{{ $t('pages.edit.conflictView.userInput') }}</td>
                    <td class="userEditLine diffContent">{{ chunk.editB }}</td>
                </tr>
            </template>
        </template>
    </table>
</template>

<style scoped>
/* Design inspired by diff2html by Rodrigo Fernandes et al. */
.conflictContainer {
    font-family: Menlo, Consolas, monospace;
    width: 100%;
}

.conflictHeading {
    background-color: #f8fafd;
    border-color: #d5e4f2;
}

.mergedLine {
    background-color: #f8f9fa;
}

.originalLine {
    background-color: #fdf2d0;
}

.remoteLine {
    background-color: #F2D2BD;
}

.userEditLine {
    background-color: rgb(221, 238, 221);
}

.bothEditLine {
    background-color: #d7ecff;
}

td:first-child {
    width: 10em;
    padding-left: 0.5em;
    border-right: 1px solid #d5e4f2;
}

td:nth-child(2) {
    padding: 0.2em 0.5em;
}

.diffContent {
    white-space: pre-wrap;
}
</style>

<script setup>
const props = defineProps({
    conflicts: {
        type: Array,
        required: true
    },
    chunks: {
        type: Array,
        default: () => []
    },
    baseRev: {
        type: Number,
        required: true
    },
    conflictRev: {
        type: Number,
        required: true
    }
})
const { t } = useI18n()

const displayChunks = computed(() => {
    const chunks = props.chunks.length > 0
        ? props.chunks
        : props.conflicts.map(conflict => ({ type: 'conflict', ...conflict }))

    let conflictCount = 0

    return chunks.map(chunk => {
        if (chunk.type !== 'conflict') return chunk

        conflictCount += 1
        return {
            ...chunk,
            conflictNumber: conflictCount,
        }
    })
})

const mergedSourceLabel = (chunk) => {
    if (chunk.source === 'editA') return `r${props.conflictRev}`
    if (chunk.source === 'editB') return t('pages.edit.conflictView.userInput')
    return `r${props.conflictRev} / ${t('pages.edit.conflictView.userInput')}`
}

const mergedLineClass = (chunk) => {
    if (chunk.source === 'editA') return 'remoteLine'
    if (chunk.source === 'editB') return 'userEditLine'
    return 'bothEditLine'
}
</script>
