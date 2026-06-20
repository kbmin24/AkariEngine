<template>
    <div id="pageTools" class="w-auto mt-2" role="group">
        <NuxtLink v-if="showButton('edit')" :to="`/edit/${pagename}`" class="btn" id="editButton" rel="nofollow"><i
                class="fas fa-pen-to-square" aria-hidden="true"></i> {{ $t('edit') }}</NuxtLink>
        <NuxtLink v-if="showButton('purge')" :to="`/purge/${pagename}`" class="btn" id="purgeButton" rel="nofollow">
            <i class="fa-solid fa-broom"></i> {{ $t('common.actions.purge') }}
        </NuxtLink>
        <NuxtLink v-if="showButton('delete')" :to="`/delete/${pagename}`" class="btn" id="deleteButton" rel="nofollow">
            <i class="fa-solid fa-trash-can"></i> {{ $t('delete') }}
        </NuxtLink>
        <NuxtLink v-if="showButton('discuss')" :to="`/threads/${pagename}`" class="btn" id="discussButton"
            rel="nofollow"><i class="fas fa-comments" aria-hidden="true"></i> {{ $t('discussion') }}</NuxtLink>
        <NuxtLink v-if="showButton('xref')" :to="`/xref/${pagename}`" class="btn" id="xrefButton" rel="nofollow"><i
                class="fas fa-link" aria-hidden="true"></i> {{ $t('xref') }}</NuxtLink>
        <NuxtLink v-if="showButton('history')" :to="`/history/${pagename}`" class="btn" id="historyButton"
            rel="nofollow"><i class="fas fa-clock-rotate-left" aria-hidden="true"></i> {{ $t('history') }}</NuxtLink>
        <a class="btn dropdown-toggle" role="button" id="pageToolsDropdown" data-bs-toggle="dropdown"
            aria-expanded="false">{{ $t('more') }}</a>
        <ul class="dropdown-menu dropdown-menu-macos shadow dropdown-menu-end" aria-labelledby="pageToolsDropdown">
            <li>
                <NuxtLink v-if="!showButton('edit')" :to="`/edit/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fas fa-pen-to-square" aria-hidden="true"></i> {{ $t('edit') }}</NuxtLink>
            </li>
            <li>
                <NuxtLink v-if="!showButton('xref')" :to="`/xref/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fas fa-link" aria-hidden="true"></i> {{ $t('xref') }}</NuxtLink>
            </li>
            <li>
                <NuxtLink v-if="!showButton('discuss')" :to="`/threads/${pagename}`" class="dropdown-item"
                    rel="nofollow"><i class="fas fa-comments" aria-hidden="true"></i> {{ $t('discussion') }}
                </NuxtLink>
            </li>
            <li>
                <NuxtLink v-if="!showButton('history')" :to="`/history/${pagename}`" class="dropdown-item"
                    rel="nofollow"><i class="fas fa-clock-rotate-left" aria-hidden="true"></i> {{ $t('history') }}
                </NuxtLink>
            </li>
            <li>
                <NuxtLink :to="`/move/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fa-solid fa-circle-right"></i> {{ $t('move') }}</NuxtLink>
            </li>
            <li>
                <NuxtLink :to="`/protect/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fa-solid fa-lock"></i> {{ $t('protect') }}
                </NuxtLink>
            </li>
            <li>
                <NuxtLink :to="`/delete/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fa-solid fa-trash-can"></i> {{ $t('delete') }}</NuxtLink>
            </li>
            <li v-if="userStore.isAdmin">
                <NuxtLink :to="`/purge/${pagename}`" class="dropdown-item" rel="nofollow"><i
                        class="fa-solid fa-broom"></i> {{ $t('common.actions.purge') }}</NuxtLink>
            </li>
        </ul>
    </div>
</template>

<style scoped>
#pageTools>*:first-child {
    border-radius: var(--bs-border-radius) 0 0 var(--bs-border-radius);
}

/* 2nd last because we have ul, plus dedupe borders */
#pageTools>*:nth-last-child(2) {
    border-radius: 0 var(--bs-border-radius) var(--bs-border-radius) 0;
    border-left: none;
}

#pageTools>*:not(:first-child):not(:nth-last-child(2)):not(:last-child) {
    border-radius: 0;
    border-left: none;
}

#pageToolsDropdown {
    border-radius: 0 var(--bs-border-radius) var(--bs-border-radius) 0;
}

.btn {
    box-shadow: inset 0 0 0 0 rgba(0, 0, 0, 0.125);
    border: 1px solid rgba(0, 0, 0, 0.125);
}

.btn:hover,
.dropdown-menu>li:hover {
    background-color: var(--bs-primary);
    color: white;
    transition: all .3s;
}
</style>

<script setup>
const props = defineProps({
    pagename: { type: String, required: true },
    pageMode: { type: String, default: 'page' },
})

const { store: userStore } = useAuth()

const showButtonRepo = {
    page: ['edit', 'discuss'],
    edit: ['history', 'xref'],
    xref: ['edit', 'history'],
    discuss: ['edit', 'history'],
    move: ['edit', 'history'],
    protect: ['history'],
    delete: ['history'],
    purge: ['delete', 'history'],
    history: ['edit'],
    diff: ['history']
}

function showButton(actionName) {
    // fetchMe is async
    if (
        props.pageMode === 'delete' &&
        actionName === 'purge'
    ) {
        return userStore.isAdmin
    }
    return showButtonRepo[props.pageMode]?.includes(actionName)
}
</script>
