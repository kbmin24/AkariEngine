<template>
    <div class="d-flex flex-column min-vh-100">
        <Navbar />
        <div class="container container-fluid">
            <div class="articleRCWrapper d-flex">
                <div class="article-wrapper h-75 border rounded row flex-grow-1">
                    <div class="pb-2 mt-2 mb-3 titleArea">
                        <h1 class="pgTitle">
                            <NuxtLink v-if="header.isPage" class="pgTitleLink" :to="`/w/${header.pagename}`">
                                {{ header.title }}
                            </NuxtLink>
                            <template v-else>{{ header.title }}</template>
                            <h5 v-if="header.titleInfo || header.rev || header.redirectFrom || header.isUserAdminPage"
                                style="display: inline; margin-left: 10px;">
                                <span v-if="header.titleInfo">{{ header.titleInfo }}</span>
                                <PageTitleInfo
                                    v-else
                                    :rev="header.rev"
                                    :redirect-from="header.redirectFrom"
                                    :is-user-admin-page="header.isUserAdminPage"
                                />
                            </h5>
                        </h1>
                        <PageTools v-if="header.isPage" :pagename="header.pagename" :pageMode="header.pageMode" />
                        <template v-if="header.updatedAt">
                            <div style="clear: both;"></div>
                            <span style="float: right;">{{ $t('recentlyEditedAt') }}: {{ $d(new Date(header.updatedAt), 'full') }}</span>
                        </template>
                        <div v-if="header.description" class="text-muted">{{ header.description }}</div>
                    </div>

                    <div style="clear: both;"></div>
                    <Satobox />
                    <article id="article">
                        <slot />
                    </article>
                </div>
                <RecentChangesSidebar v-if="rcSidebarEnabled" />
            </div>
        </div>
        <Footer />
        <FloatingToolbox />
    </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import PageTools from './components/PageTools.vue'
import FloatingToolbox from './components/FloatingToolbox.vue'
import RecentChangesSidebar from './components/RecentChangesSidebar.vue'
import { useRcSidebarSetting } from './composables/useRcSidebarSetting.js'

const { fetchMe } = useAuth()
const store = useUserStore()
const { header } = usePageHeader()
const { value: rcSidebarEnabled, load: loadRcSidebarPreference } = useRcSidebarSetting()

const satoboxVisible = ref(false)

useHead({
    link: [
        { rel: 'stylesheet', href: '/skins/GECWiki/css/mainview.css' },
        { rel: 'stylesheet', href: '/skins/GECWiki/css/rcsidebar.css' },
        { rel: 'stylesheet', href: '/skins/GECWiki/css/floatingToolbox.css' },
    ],
})

onMounted(async () => {
    loadRcSidebarPreference()
    await fetchMe()
})
</script>
