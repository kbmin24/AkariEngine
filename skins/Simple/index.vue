<template>
    <div class="simple-skin">
        <header class="simple-header">
            <h1>
                <NuxtLink to="/">{{ config.public.appname }}</NuxtLink>
            </h1>
            <nav aria-label="Main navigation">
                <NuxtLink to="/RecentChanges">{{ $t('recentChanges') }}</NuxtLink>
                <NuxtLink to="/RecentDiscuss">{{ $t('recentDiscuss') }}</NuxtLink>
                <NuxtLink to="/RandomPage">{{ $t('randomPage') }}</NuxtLink>
                <NuxtLink to="/PageList">{{ $t('pageList') }}</NuxtLink>
                <NuxtLink to="/Upload">{{ $t('upload') }}</NuxtLink>
                <NuxtLink to="/viewrank">{{ $t('viewRank') }}</NuxtLink>
                <NuxtLink to="/Licence">{{ $t('licence') }}</NuxtLink>
            </nav>
            <div class="simple-user">
                <template v-if="store.isLoggedIn">
                    <NuxtLink :to="`/w/User:${store.username}`">{{ store.username }}</NuxtLink>
                    <span>|</span>
                    <NuxtLink :to="`/contribution/${store.username}`">{{ $t('contribList') }}</NuxtLink>
                </template>
                <template v-else>
                    <NuxtLink to="/login">{{ $t('login') }}</NuxtLink>
                </template>
                <span>|</span>
                <NuxtLink to="/settings">{{ $t('settings') }}</NuxtLink>
            </div>
            <form class="simple-search" role="search" @submit.prevent="onSearch">
                <input v-model="searchQuery" :placeholder="$t('search')" autocomplete="off" type="search" required>
                <button type="submit">{{ $t('search') }}</button>
            </form>
        </header>

        <main>
            <section class="simple-title">
                <h2>
                    <NuxtLink v-if="header.isPage" :to="`/w/${header.pagename}`">{{ header.title }}</NuxtLink>
                    <template v-else>{{ header.title }}</template>
                </h2>
                <div v-if="header.titleInfo || header.rev || header.redirectFrom || header.isUserAdminPage"
                    class="simple-title-info">
                    <span v-if="header.titleInfo">{{ header.titleInfo }}</span>
                    <PageTitleInfo
                        v-else
                        :rev="header.rev"
                        :redirect-from="header.redirectFrom"
                        :is-user-admin-page="header.isUserAdminPage"
                    />
                </div>
                <nav v-if="header.isPage" class="simple-page-tools" aria-label="Page tools">
                    <NuxtLink :to="`/w/${header.pagename}`">{{ $t('page') }}</NuxtLink>
                    <NuxtLink :to="`/edit/${header.pagename}`">{{ $t('edit') }}</NuxtLink>
                    <NuxtLink :to="`/xref/${header.pagename}`">{{ $t('xref') }}</NuxtLink>
                    <NuxtLink :to="`/threads/${header.pagename}`">{{ $t('discussion') }}</NuxtLink>
                    <NuxtLink :to="`/history/${header.pagename}`">{{ $t('history') }}</NuxtLink>
                    <NuxtLink :to="`/move/${header.pagename}`">{{ $t('move') }}</NuxtLink>
                    <NuxtLink :to="`/protect/${header.pagename}`">{{ $t('protect') }}</NuxtLink>
                    <NuxtLink :to="`/delete/${header.pagename}`">{{ $t('delete') }}</NuxtLink>
                </nav>
                <p v-if="header.updatedAt" class="simple-updated">
                    {{ $t('recentlyEditedAt') }}: {{ $d(new Date(header.updatedAt), 'full') }}
                </p>
                <p v-if="header.description" class="simple-description">{{ header.description }}</p>
            </section>

            <article class="simple-content">
                <slot />
            </article>
        </main>

        <footer class="simple-footer">
            <div>Powered by <NuxtLink to="/Licence">AkariEngine</NuxtLink></div>
            <div>Contents are licensed under {{ config.public.licence }} unless otherwise specified.</div>
        </footer>
    </div>
</template>

<script setup>
const config = useRuntimeConfig()
const { fetchMe } = useAuth()
const store = useUserStore()
const { header } = usePageHeader()
const searchQuery = ref('')

const onSearch = async () => {
    const query = searchQuery.value.trim()
    if (!query) return
    await navigateTo({ path: '/search', query: { q: query } })
}

onMounted(fetchMe)
</script>

<style scoped>
.simple-skin {
    color: #111;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.5;
    margin: 0 auto;
    max-width: 72rem;
    padding: 0.75rem 1rem 2rem;
}

.simple-header {
    border-bottom: 1px solid #999;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    text-align: center;
}

.simple-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem;
}

.simple-header nav,
.simple-user,
.simple-page-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.65rem;
    justify-content: center;
}

.simple-search {
    display: flex;
    gap: 0.35rem;
    justify-content: center;
    margin-top: 0.75rem;
}

.simple-search input {
    min-width: 16rem;
}

.simple-title {
    border-bottom: 1px solid #bbb;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
}

.simple-title h2 {
    font-size: 1.7rem;
    margin: 0 0 0.4rem;
}

.simple-title-info,
.simple-updated,
.simple-description {
    color: #555;
    margin: 0.35rem 0;
}

.simple-content {
    min-height: 45vh;
}

.simple-footer {
    border-top: 1px solid #bbb;
    color: #555;
    font-size: 0.9rem;
    margin-top: 2rem;
    padding-top: 0.75rem;
    text-align: center;
}

@media (max-width: 640px) {
    .simple-search {
        align-items: stretch;
        flex-direction: column;
    }

    .simple-search input {
        min-width: 0;
        width: 100%;
    }
}
</style>
