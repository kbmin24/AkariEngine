<template>
    <div class="navbar-item buma-search-item">
        <form class="field has-addons buma-search" role="search" @submit.prevent="onSearch" autocomplete="off">
            <div class="control has-icons-left is-expanded buma-search-input-wrapper">
                <input v-model="searchQuery" class="input is-primary" :class="{ 'buma-search-input-open': showDropdown }"
                    :placeholder="$t('search')" autocomplete="off" type="search" required
                    @input="onSearchInput"
                    @compositionend="onSearchCompositionEnd"
                    @keydown.down.prevent="activateNext"
                    @keydown.up.prevent="activatePrev"
                    @keydown.escape="closeDropdown"
                    @blur="closeDropdown">
                <span class="icon is-small is-left">
                    <i class="fas fa-search" aria-hidden="true"></i>
                </span>
                <ul v-if="showDropdown" class="buma-autocomplete-dropdown">
                    <li v-for="(title, index) in suggestions" :key="title"
                        :class="{ active: index === activeIndex }"
                        @mousedown.prevent="selectSuggestion(title)">
                        {{ title }}
                    </li>
                </ul>
            </div>
        </form>
    </div>
</template>

<style scoped>
.buma-search-item {
    position: relative;
}

.buma-search {
    position: relative;
}

.buma-search-input-wrapper {
    position: relative;
}

.buma-autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1050;
    margin: 0;
    padding: 0;
    list-style: none;
    background-color: #fff;
    border: 1px solid #dbdbdb;
    border-top: none;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    max-height: 300px;
    overflow-y: auto;
}

.buma-autocomplete-dropdown li {
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: #363636;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.buma-autocomplete-dropdown li:hover,
.buma-autocomplete-dropdown li.active {
    background-color: #f5f5f5;
}

.buma-search-input-open {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}
</style>

<script setup>
const searchQuery = ref('')
const suggestions = ref([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
let debounceTimer = null

const queueAutocomplete = (query) => {
    activeIndex.value = -1
    clearTimeout(debounceTimer)
    const q = query.trim()
    if (!q) {
        suggestions.value = []
        showDropdown.value = false
        return
    }

    debounceTimer = setTimeout(async () => {
        const data = await $fetch('/api/autocomplete', { query: { q } })
        suggestions.value = Array.isArray(data) ? data.map(item => item.title) : []
        showDropdown.value = suggestions.value.length > 0
    }, 200)
}

const onSearchInput = (event) => {
    const query = event?.target?.value ?? searchQuery.value
    queueAutocomplete(query)
}

const onSearchCompositionEnd = async (event) => {
    searchQuery.value = event.target.value
    await nextTick()
    queueAutocomplete(searchQuery.value)
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

    const query = searchQuery.value.trim()
    if (!query) return

    const { data, error } = await useFetch(
        () => '/api/search',
        {
            method: 'POST',
            body: {
                pagename: query
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
</script>