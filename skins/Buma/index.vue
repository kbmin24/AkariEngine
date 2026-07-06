<template>
    <div id="top" class="buma-skin">
        <nav class="navbar buma-navbar" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <NuxtLink class="navbar-item buma-brand" to="/">{{ config.public.appname }}</NuxtLink>
                <button class="navbar-burger" :class="{ 'is-active': menuOpen }" type="button" aria-label="menu"
                    :aria-expanded="menuOpen" aria-controls="bumaMainNavbar" @click="menuOpen = !menuOpen">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                </button>
            </div>

            <div id="bumaMainNavbar" class="navbar-menu" :class="{ 'is-active': menuOpen }">
                <div class="navbar-start">
                    <NuxtLink class="navbar-item" to="/RecentChanges">
                        <span class="icon"><i class="fas fa-binoculars" aria-hidden="true"></i></span>
                        <span>{{ $t('recentChanges') }}</span>
                    </NuxtLink>
                    <NuxtLink class="navbar-item" to="/RecentDiscuss">
                        <span class="icon"><i class="fas fa-comments" aria-hidden="true"></i></span>
                        <span>{{ $t('recentDiscuss') }}</span>
                    </NuxtLink>

                    <div class="navbar-item has-dropdown is-hoverable" :class="{ 'is-active': toolsOpen }">
                        <button class="navbar-link buma-navbar-link" type="button" :aria-expanded="toolsOpen"
                            @click="toggleToolsMenu">
                            <span class="icon"><i class="fas fa-cogs" aria-hidden="true"></i></span>
                            <span>{{ $t('tools') }}</span>
                        </button>
                        <div v-if="toolsOpen" class="navbar-dropdown">
                            <NuxtLink v-for="item in toolLinks" :key="item.to" class="navbar-item" :to="item.to"
                                @click="closeToolsMenu">
                                <span class="icon"><i :class="item.icon" aria-hidden="true"></i></span>
                                <span>{{ $t(item.labelKey) }}</span>
                            </NuxtLink>
                        </div>
                    </div>
                </div>

                <div class="navbar-end">
                    <BumaSearch />

                    <div class="navbar-item has-dropdown is-hoverable" :class="{ 'is-active': accountOpen }">
                        <button class="navbar-link buma-navbar-link" type="button" :aria-expanded="accountOpen"
                            @click="toggleAccountMenu">
                            <span class="icon">
                                <i :class="store.isLoggedIn ? 'fas fa-user' : 'fas fa-sign-in-alt'"
                                    aria-hidden="true"></i>
                            </span>
                            <span>{{ userLabel || $t('login') }}</span>
                        </button>
                        <div v-if="accountOpen" class="navbar-dropdown is-right">
                            <NuxtLink v-if="store.isLoggedIn" class="navbar-item" :to="`/w/User:${store.username}`"
                                @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-sticky-note" aria-hidden="true"></i></span>
                                <span>{{ $t('userPage') }}</span>
                            </NuxtLink>
                            <NuxtLink v-if="userLabel" class="navbar-item" :to="`/contribution/${userLabel}`"
                                @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-chart-line" aria-hidden="true"></i></span>
                                <span>{{ $t('contribList') }}</span>
                            </NuxtLink>
                            <NuxtLink class="navbar-item" to="/settings" @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-cogs" aria-hidden="true"></i></span>
                                <span>{{ $t('settings') }}</span>
                            </NuxtLink>
                            <NuxtLink v-if="store.isAdmin" class="navbar-item" to="/admin" @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-lock" aria-hidden="true"></i></span>
                                <span>{{ $t('adminMenu') }}</span>
                            </NuxtLink>
                            <NuxtLink v-if="store.isLoggedIn" class="navbar-item" to="/logout" @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-sign-out-alt" aria-hidden="true"></i></span>
                                <span>{{ $t('logout') }}</span>
                            </NuxtLink>
                            <NuxtLink v-else class="navbar-item" to="/login" @click="closeAccountMenu">
                                <span class="icon"><i class="fas fa-sign-in-alt" aria-hidden="true"></i></span>
                                <span>{{ $t('login') }}</span>
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <section class="hero is-primary buma-hero" id="wiki-main-title">
            <div class="hero-body">
                <div class="container">
                    <h1 class="title">
                        <NuxtLink v-if="header.isPage" class="pgTitleLink" :to="`/w/${header.pagename}`">
                            {{ header.title }}
                        </NuxtLink>
                        <template v-else>{{ header.title }}</template>
                    </h1>
                    <h2 v-if="header.titleInfo || header.rev || header.redirectFrom || header.isUserAdminPage || header.updatedAt || header.description"
                        class="subtitle">
                        <span v-if="header.titleInfo">{{ header.titleInfo }}</span>
                        <PageTitleInfo
                            v-else-if="header.rev || header.redirectFrom || header.isUserAdminPage"
                            :rev="header.rev"
                            :redirect-from="header.redirectFrom"
                            :is-user-admin-page="header.isUserAdminPage"
                        />
                        <span v-if="header.updatedAt">
                            <span v-if="header.titleInfo || header.rev || header.redirectFrom || header.isUserAdminPage"> / </span>
                            {{ $t('recentlyEditedAt') }}: {{ $d(new Date(header.updatedAt), 'full') }}
                        </span>
                        <span v-if="header.description">
                            <span v-if="header.titleInfo || header.rev || header.redirectFrom || header.isUserAdminPage || header.updatedAt"> / </span>
                            {{ header.description }}
                        </span>
                    </h2>
                </div>
            </div>

            <div class="hero-foot">
                <div class="container">
                    <div class="tabs is-left is-boxed buma-page-tabs" id="wiki-article-menu">
                        <ul>
                            <li v-if="header.isPage === false" class="is-active">
                                <!-- needs an empty a to render tab shape-->
                                <a href="#">
                                    <span class="pageBar_icon"><i class="fas fa-cogs" aria-hidden="true"></i></span>
                                    <span>{{ $t('Buma.navBar.specialPage') }}</span>
                                </a>
                            </li>
                            <li v-for="tab in pageTabs" v-else :key="tab.mode"
                                :class="{ 'is-active': isActiveTab(tab.mode) }">
                                <NuxtLink :to="`/${tab.path}/${header.pagename}`" rel="nofollow">
                                    <span class="pageBar_icon"><i :class="tab.icon" aria-hidden="true"></i></span>
                                    <span>{{ $t(tab.labelKey) }}</span>
                                </NuxtLink>
                            </li>
                            <li v-if="header.isPage === 'true' && store.isAdmin" :class="{ 'is-active': isActiveTab('purge') }">
                                <NuxtLink :to="`/purge/${pagename}`" rel="nofollow">
                                    <span class="pageBar_icon"><i class="fa-solid fa-broom"></i></span>
                                    <span>{{ $t('common.actions.purge') }}</span>
                                </NuxtLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section class="section buma-content-section">
            <div class="container container-main">
                <Satobox />
                <article class="wiki-article">
                    <slot />
                </article>
            </div>

            <nav id="nav_bar" aria-label="Page anchors">
                <div id="go_top">
                    <a href="#top" aria-label="Go to top"><i class="fas fa-arrow-up" aria-hidden="true"></i></a>
                </div>
                <div id="go_bottom">
                    <a href="#bottom" aria-label="Go to bottom"><i class="fas fa-arrow-down" aria-hidden="true"></i></a>
                </div>
                <div id="go_toc">
                    <a href="#toc" aria-label="Go to table of contents"><i class="fas fa-list" aria-hidden="true"></i></a>
                </div>
            </nav>
        </section>

        <footer class="footer buma-footer">
            <div id="bottom" class="container content has-text-centered">
                <div>Powered by <NuxtLink to="/Licence">AkariEngine</NuxtLink></div>
                <div>Contents are licensed under {{ config.public.licence }} unless otherwise specified.</div>
            </div>
        </footer>
    </div>
</template>

<script setup>
import BumaSearch from './components/BumaSearch.vue'

const config = useRuntimeConfig()
const { fetchMe } = useAuth()
const store = useUserStore()
const { header } = usePageHeader()

await useSkinI18n('Buma')

const menuOpen = ref(false)
const searchQuery = ref('')
const toolsOpen = ref(false)
const accountOpen = ref(false)
const isMobileViewport = ref(false)

const userLabel = computed(() => store.username || store.ipAddress || '')

function updateMobileViewport() {
    if (!import.meta.client) {
        return
    }

    isMobileViewport.value = window.innerWidth <= 1023
    if (!isMobileViewport.value) {
        toolsOpen.value = false
        accountOpen.value = false
    }
}

function toggleToolsMenu() {
    if (!import.meta.client) {
        return
    }

    toolsOpen.value = !toolsOpen.value
}

function closeToolsMenu() {
    if (!import.meta.client) {
        return
    }

    toolsOpen.value = false
    menuOpen.value = false
}

function toggleAccountMenu() {
    if (!import.meta.client) {
        return
    }

    accountOpen.value = !accountOpen.value
}

function closeAccountMenu() {
    if (!import.meta.client) {
        return
    }

    accountOpen.value = false
    menuOpen.value = false
}

const toolLinks = [
    { to: '/RandomPage', icon: 'fas fa-random', labelKey: 'randomPage' },
    { to: '/orphaned', icon: 'fas fa-link', labelKey: 'orphaned_pages' },
    { to: '/PageList', icon: 'fas fa-list-ul', labelKey: 'pageList' },
    { to: '/Upload', icon: 'fas fa-upload', labelKey: 'upload' },
    { to: '/adminlog', icon: 'fas fa-history', labelKey: 'adminLog' },
    { to: '/viewrank', icon: 'fas fa-chart-line', labelKey: 'viewRank' },
    { to: '/Licence', icon: 'fas fa-check', labelKey: 'licence' },
]

const pageTabs = [
    { mode: 'view', path: 'w', icon: 'fas fa-eye', labelKey: 'page' },
    { mode: 'edit', path: 'edit', icon: 'fas fa-edit', labelKey: 'edit' },
    { mode: 'xref', path: 'xref', icon: 'fas fa-link', labelKey: 'xref' },
    { mode: 'threads', path: 'threads', icon: 'fas fa-comments', labelKey: 'discussion' },
    { mode: 'history', path: 'history', icon: 'fas fa-history', labelKey: 'history' },
    { mode: 'move', path: 'move', icon: 'fas fa-arrow-right', labelKey: 'move' },
    { mode: 'protect', path: 'protect', icon: 'fas fa-key', labelKey: 'protect' },
    { mode: 'delete', path: 'delete', icon: 'fas fa-trash-alt', labelKey: 'delete' },
]

function isActiveTab(tabMode) {
    const pageMode = header.value.pageMode === 'page' ? 'view' : header.value.pageMode
    return pageMode === tabMode
}

useHead({
    link: [
        { rel: 'stylesheet', href: '/skins/Buma/css/bulma.css' },
        { rel: 'stylesheet', href: '/skins/Buma/css/fa-svg-with-js.css' },
        { rel: 'stylesheet', href: '/skins/Buma/css/layout.css' },
        { rel: 'stylesheet', href: '/skins/Buma/css/plus.css' },
    ],
})

onMounted(() => {
    fetchMe()
    updateMobileViewport()
    window.addEventListener('resize', updateMobileViewport)
})

onBeforeUnmount(() => {
    if (import.meta.client) {
        window.removeEventListener('resize', updateMobileViewport)
    }
})
</script>

<style scoped>
.buma-skin {
    background: #fff;
    color: #2b2f33;
    min-height: 100vh;
}

.buma-navbar {
    padding: 0;
}

.buma-brand {
    font-weight: 700;
}

.buma-navbar-link {
    background: transparent;
    border: 0;
    border-radius: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    height: 100%;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    text-align: left;
    width: 100%;
}

.buma-search {
    min-width: min(26rem, 42vw);
}

.buma-hero :deep(.pgTitleLink) {
    color: inherit;
}

.buma-page-tabs {
    overflow-x: auto;
}

.buma-page-tabs ul {
    flex-wrap: nowrap;
}

.buma-page-tabs li > span {
    align-items: center;
    color: #fff;
    display: flex;
    padding: 0.5em 1em;
}

.buma-content-section {
    min-height: 52vh;
}

.wiki-article {
    min-width: 0;
}

.buma-footer {
    margin-top: 2rem;
}

#nav_bar a {
    color: #fff;
}
#wiki-article-menu ul {
    margin-bottom: 0;
}

@media screen and (max-width: 1023px) {
    .buma-search {
        min-width: 0;
        width: 100%;
    }

    .buma-navbar-link {
        color: #4a4a4a;
        padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    }

    .navbar-dropdown {
        display: block;
        padding-left: 0.75rem;
    }
}

.buma-navbar-link:hover {
    background-color: whitesmoke;
    color: #3273dc;
}

.container-main {
    overflow-x: scroll;
}
</style>
