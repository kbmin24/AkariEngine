<template>
    <div class="d-flex flex-column min-vh-100">
        <GECWikiNavbar />
        <div class="container container-fluid">
            <div class="articleRCWrapper d-flex">
                <div class="article-wrapper h-75 border rounded row flex-grow-1">

                    <div v-if="satoboxVisible" class="alert alert-info" id="satobox" role="alert">
                        <i18n-t key="userDiscussionOpen" tag="span">
                            <template #link>
                                <NuxtLink :to="`/threads/User:${store.username}`" id="satoboxlink">{{ $t('userDiscussion') }}</NuxtLink>
                            </template>
                        </i18n-t>
                    </div>

                    <div class="pb-2 mt-2 mb-3 titleArea">
                        <h1 class="pgTitle">
                            <NuxtLink v-if="header.titleLink" class="pgTitleLink" :to="header.titleLink">
                                {{ header.title }}
                            </NuxtLink>
                            <template v-else>{{ header.title }}</template>
                            <h5 v-if="header.titleInfo" style="display: inline; margin-left: 10px;"
                                v-html="header.titleInfo"></h5>
                        </h1>
                        <GECWikiPageTools v-if="header.isPage" :pagename="header.pagename" :pageMode="header.pageMode" />
                        <template v-if="header.updatedAt">
                            <div style="clear: both;"></div>
                            <span style="float: right;">{{ $t('recentlyEditedAt') }}: {{ $d(new Date(header.updatedAt), 'full') }}</span>
                        </template>
                        <div v-if="header.description" class="text-muted">{{ header.description }}</div>
                    </div>

                    <div style="clear: both;"></div>
                    <article id="article">
                        <slot />
                    </article>
                </div>
                <GECWikiRecentChangesSidebar />
            </div>
        </div>
        <GECWikiFooter />
        <GECWikiFloatingToolbox />
    </div>
</template>

<script setup>
const { fetchMe } = useAuth()
const store = useUserStore()
const { header } = usePageHeader()

const satoboxVisible = ref(false)

useHead({
    link: [
        { rel: 'stylesheet', href: '/skins/GECWiki/css/mainview.css' },
        { rel: 'stylesheet', href: '/skins/GECWiki/css/rcsidebar.css' },
        { rel: 'stylesheet', href: '/skins/GECWiki/css/floatingToolbox.css' },
    ],
})

onMounted(async () => {
    await fetchMe()
    if (store.isLoggedIn) {
        try {
            const data = await $fetch(`/api/threads/User:${store.username}`)
            satoboxVisible.value = (data.openThreads?.length ?? 0) > 0
        } catch {
            // ignore
        }
    }
})
</script>
