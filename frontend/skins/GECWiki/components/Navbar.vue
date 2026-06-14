<template>
    <nav class="navbar navbar-dark bg-primary fixed-top">
        <div class="container-fluid nav-contents">
            <NuxtLink class="navbar-brand" to="/">{{ config.public.appname }}</NuxtLink>

            <ul class="navbar-nav me-auto mb-lg-0" style="flex-direction: row;">
                <li class="nav-item">
                    <NuxtLink class="nav-link" to="/RecentChanges">
                        <i class="fas fa-arrows-rotate nav-icon"></i>
                        <span class="d-none d-lg-inline">{{ $t('recentChanges') }}</span>
                    </NuxtLink>
                </li>
                <li class="nav-item">
                    <NuxtLink class="nav-link" to="/RecentDiscuss">
                        <i class="fas fa-comments nav-icon"></i>
                        <span class="d-none d-lg-inline">{{ $t('recentDiscuss') }}</span>
                    </NuxtLink>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="fas fa-gear"></i>
                        <span class="d-none d-lg-inline">{{ $t('tools') }}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-macos shadow" style="position: absolute;">
                        <li>
                            <NuxtLink class="dropdown-item" to="/RandomPage">
                                <i class="fas fa-shuffle nav-icon"></i> {{ $t('randomPage') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/PageList">
                                <i class="fas fa-list-ul nav-icon"></i> {{ $t('pageList') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/orphaned">
                                <i class="fas fa-link nav-icon"></i> {{ $t('orphaned_pages') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/Upload">
                                <i class="fas fa-upload nav-icon"></i> {{ $t('upload') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/adminlog">
                                <i class="fas fa-clock-rotate-left nav-icon"></i> {{ $t('adminLog') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/viewrank">
                                <i class="fas fa-chart-line nav-icon"></i> {{ $t('viewRank') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/Licence">
                                <i class="fas fa-check nav-icon"></i> {{ $t('licence') }}
                            </NuxtLink>
                        </li>
                    </ul>
                </li>
            </ul>

            <div class="navbar-nav" id="userIcon">
                <div class="dropdown">
                    <button class="btn" id="navUserDropDown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i v-if="store.isLoggedIn" class="fas fa-circle-user text-light fa-lg"></i>
                        <i v-else class="fas fa-right-to-bracket text-light"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end position-absolute dropdown-menu-macos mx-0 shadow"
                        aria-labelledby="navUserDropDown">
                        <li class="userButton_username">
                            {{ store.username ?? store.ipAddress }}
                        </li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li v-if="store.isLoggedIn">
                            <NuxtLink class="dropdown-item" :to="`/w/User:${store.username}`">{{ $t('userPage') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" :to="`/contribution/${store.username ?? store.ipAddress}`">
                                {{ $t('contribList') }}</NuxtLink>
                        </li>
                        <hr style="margin: 0.3rem 0;">
                        <li>
                            <NuxtLink class="dropdown-item" to="/settings">{{ $t('settings') }}</NuxtLink>
                        </li>
                        <li v-if="store.isAdmin">
                            <NuxtLink class="dropdown-item" to="/admin">{{ $t('adminMenu') }}</NuxtLink>
                        </li>
                        <hr style="margin: 0.3rem 0;">
                        <li>
                            <NuxtLink v-if="store.isLoggedIn" class="dropdown-item" to="/logout">{{ $t('logout') }}
                            </NuxtLink>
                            <NuxtLink v-else class="dropdown-item" to="/login">{{ $t('login') }}</NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>

            <form class="input-group d-flex" id="searchBox" role="search" @submit.prevent="onSearch" autocomplete="off">
                <div style="position: relative; flex: 1;">
                    <input class="form-control" v-model="searchQuery" id="searchinput" type="search"
                        :placeholder="$t('search')" :aria-label="$t('search')" required
                        :style="{
                            'border-bottom-left-radius': showDropdown ? '0' : 'var(--bs-border-radius)',
                        }"
                        @input="onSearchInput"
                        @keydown.down.prevent="activateNext"
                        @keydown.up.prevent="activatePrev"
                        @keydown.escape="closeDropdown"
                        @blur="closeDropdown">
                    <ul v-if="showDropdown" class="autocomplete-dropdown rounded-bottom">
                        <li v-for="(title, index) in suggestions" :key="title"
                            :class="{ active: index === activeIndex }"
                            @mousedown.prevent="selectSuggestion(title)">
                            {{ title }}
                        </li>
                    </ul>
                </div>
                <button class="btn btn-outline-light bg-primary" id="searchSubmit" type="submit">
                    <i class="fas fa-arrow-right text-light"></i>
                </button>
            </form>
        </div>
    </nav>
</template>

<style scoped>
.autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1050;
    margin: 0;
    padding: 0;
    list-style: none;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    max-height: 300px;
    overflow-y: auto;
}

.autocomplete-dropdown li {
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: #212529;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.autocomplete-dropdown li:hover,
.autocomplete-dropdown li.active {
    background-color: #e9ecef;
}
#searchinput {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

</style>

<script setup>
const config = useRuntimeConfig()

const store = useUserStore()

const searchQuery = ref('')
const suggestions = ref([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
let debounceTimer = null

const onSearchInput = () => {
    activeIndex.value = -1
    clearTimeout(debounceTimer)
    const q = searchQuery.value.trim()
    if (!q) {
        suggestions.value = []
        showDropdown.value = false
        return
    }
    debounceTimer = setTimeout(async () => {
        const data = await $fetch('/api/autocomplete', { query: { q } })
        suggestions.value = Array.isArray(data) ? data.map(r => r.title) : []
        showDropdown.value = suggestions.value.length > 0
    }, 200)
}

const activateNext = () => {
    if (!showDropdown.value) return
    activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1)
}

const activatePrev = () => {
    if (!showDropdown.value) return
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
}

const closeDropdown = () => {
    showDropdown.value = false
    activeIndex.value = -1
}

const selectSuggestion = async (title) => {
    closeDropdown()
    searchQuery.value = ''
    await navigateTo(`/w/${title}`)
}

const onSearch = async () => {
    if (activeIndex.value >= 0 && suggestions.value[activeIndex.value]) {
        await selectSuggestion(suggestions.value[activeIndex.value])
        return
    }
    if (searchQuery.value.trim()) {
        const { data, error } = await useFetch(
            () => `/api/search`,
            {
                method: 'POST',
                body: {
                    pagename: searchQuery.value.trim()
                }
            }
        )
        if (error.value) {
            console.error('Search API error:', error.value)
            return
        }
        await navigateTo(data.value.redirect)
        searchQuery.value = ''
    }
}
</script>
