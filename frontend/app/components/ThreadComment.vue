<template>
    <article :id="anchor" class="thread-comment">
        <div class="thread-comment-header" :class="headerClasses">
            <a class="thread-comment-number" :href="`#${anchor}`">#{{ number }}</a>
            <UserTooltip :user="comment.username" />
            <time class="thread-comment-time" :datetime="comment.date">{{ formattedDate }}</time>
        </div>
        <div class="thread-comment-content">
            <em v-if="comment.isHidden">{{ $t('pages.thread.hiddenComment') }}</em>
            <template v-else-if="comment.type !== 'comment'">
                <em>{{ eventLabel }}</em>
                <div v-if="comment.content" v-html="comment.content"></div>
            </template>
            <div v-else v-html="comment.content"></div>
        </div>
    </article>
</template>

<script setup>
const props = defineProps({
    comment: { type: Object, required: true },
    number: { type: Number, required: true },
    currentUsername: { type: String, default: '' }
})

const { t } = useI18n()

const anchor = computed(() => `comment-${props.comment.id}`)
const headerClasses = computed(() => ({
    'thread-comment-header-own': props.comment.username === props.currentUsername,
    'thread-comment-header-hidden': props.comment.isHidden,
    'thread-comment-header-admin': props.comment.type !== 'comment'
}))
const eventLabel = computed(() => {
    const key = `pages.thread.events.${props.comment.type}`
    return t(key) === key ? props.comment.type : t(key)
})
const formattedDate = computed(() => {
    const date = new Date(props.comment.date)
    if (Number.isNaN(date.getTime())) return ''

    const seoulTime = new Date(date.getTime() + (9 * 60 * 60 * 1000))
    return seoulTime.toISOString().slice(0, 19).replace('T', ' ').replaceAll('-', '/')
})
</script>

<style scoped>
.thread-comment {
    width: 100%;
    margin-bottom: 0.625rem;
    border: 1px solid var(--bs-border-color);
    background-color: var(--bs-body-bg);
}

.thread-comment-header {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background-color: var(--bs-secondary-bg);
}

.thread-comment-header-own {
    background-color: var(--bs-primary-bg-subtle);
}

.thread-comment-header-admin {
    background-color: var(--bs-success-bg-subtle);
}

.thread-comment-header-hidden {
    background-color: var(--bs-danger-bg-subtle);
}

.thread-comment-number {
    font-weight: 600;
}

.thread-comment-time {
    text-align: right;
    white-space: nowrap;
}

.thread-comment-content {
    max-height: 32rem;
    overflow-y: auto;
    padding: 0.625rem;
    overflow-wrap: anywhere;
}

@media (max-width: 576px) {
    .thread-comment-header {
        grid-template-columns: 3rem minmax(0, 1fr);
    }

    .thread-comment-time {
        grid-column: 1 / -1;
        text-align: left;
    }
}
</style>
<style>
.thread-comment-content > div > p:last-child {
    margin-bottom: 0;
}
</style>