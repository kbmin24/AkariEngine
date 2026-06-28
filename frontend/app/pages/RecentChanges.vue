<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams" :message="errorMessageFallback"
            tag="p" />
    </div>
    <div v-else>
        <div class="recent-changes-toolbar">
            <div ref="dropdownRef" class="dropdown">
                <button id="recentChangesOptions" class="btn btn-secondary dropdown-toggle" type="button"
                    :aria-expanded="dropdownShown" @click="dropdownShown = !dropdownShown">
                    {{ $t('pages.recentChanges.options') }}
                </button>
                <div class="dropdown-menu dropdown-menu-macos shadow" :class="{ show: dropdownShown }"
                    id="recentChangesOptionsMenu" aria-labelledby="recentChangesOptions" v-show="dropdownShown">
                    <fieldset class="mb-2">
                        <legend>{{ $t('pages.recentChanges.nPagesShow') }}</legend>
                        <div v-for="option in showOptions" :key="option" class="form-check form-check-inline">
                            <input :id="`show${option}`" class="form-check-input" type="radio" name="show"
                                :value="option" :checked="show === option"
                                @change="navigateTo(linkWithQuery({ show: option }))">
                            <label class="form-check-label" :for="`show${option}`">{{ option }}</label>
                        </div>
                    </fieldset>
                    <fieldset class="mb-2">
                        <legend>{{ $t('pages.recentChanges.filter') }}</legend>
                        <div class="form-check">
                            <input id="cbUnique" :checked="isUnique" class="form-check-input" type="checkbox"
                                @change="toggleBooleanQuery('isunique', $event.target.checked)">
                            <label class="form-check-label" for="cbUnique">
                                {{ $t('pages.recentChanges.filters.unique') }}
                            </label>
                        </div>
                        <div class="form-check">
                            <input id="cbExcludeFile" :checked="excludeFile" class="form-check-input" type="checkbox"
                                @change="toggleBooleanQuery('excludefile', $event.target.checked)">
                            <label class="form-check-label" for="cbExcludeFile">
                                {{ $t('pages.recentChanges.filters.excludeFile') }}
                            </label>
                        </div>
                        <div class="form-check">
                            <input id="cbEditOnly" :checked="editOnly" class="form-check-input" type="checkbox"
                                @change="toggleBooleanQuery('editonly', $event.target.checked)">
                            <label class="form-check-label" for="cbEditOnly">
                                {{ $t('pages.recentChanges.filters.editOnly') }}
                            </label>
                        </div>
                    </fieldset>
                </div>
            </div>
        </div>

        <div class="recent-changes-table-wrap">
            <table class="table recent-changes-table">
                <colgroup>
                    <col class="recent-changes-page-col">
                    <col class="recent-changes-user-col">
                    <col class="recent-changes-action-col">
                    <col class="recent-changes-date-col">
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">{{ $t('pages.recentChanges.page') }}</th>
                        <th scope="col">{{ $t('pages.recentChanges.user') }}</th>
                        <th scope="col">{{ $t('pages.recentChanges.change') }}</th>
                        <th scope="col">{{ $t('pages.recentChanges.datetime') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="change in changes"
                        :key="change.id ?? `${change.page}:${change.rev}:${change.createdAt}`">
                        <tr>
                            <th scope="row" class="recent-changes-cell">
                                <NuxtLink :to="pageLink(change.page)">{{ change.page }}</NuxtLink>
                                <template v-if="change.rev">
                                    <span> (</span>
                                    <NuxtLink :to="revisionLink(change)">r{{ change.rev }}</NuxtLink>
                                    <span>)</span>
                                </template>
                                <em v-else>({{ $t('pages.recentChanges.deleted') }})</em>
                            </th>
                            <td class="recent-changes-cell">
                                <UserTooltip :user="change.doneBy" />
                            </td>
                            <td>
                                {{ $t(actionI18nLookup(change.type)) }}
                                (<span :class="byteChangeClass(change.bytechange)" class="fw-bold">
                                    {{ formatByteChange(change.bytechange) }}
                                </span>)
                            </td>
                            <td>{{ formatDate(change.createdAt) }}</td>
                        </tr>
                        <tr v-if="change.comment">
                            <td class="recent-changes-cell" colspan="4">{{ change.comment }}</td>
                        </tr>
                    </template>
                    <tr v-if="changes.length === 0">
                        <td colspan="4">{{ $t('pages.recentChanges.noResults') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const showOptions = [5, 10, 30, 100]

const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
}

const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const show = computed(() => {
    const value = Number(route.query.show || 30)
    if (![5, 10, 30, 100].includes(value)) return 30
    return value
})

const dropdownRef = ref(null)
const dropdownShown = ref(false)

const closeDropdownOnOutsideClick = (event) => {
    if (!dropdownRef.value?.contains(event.target)) {
        dropdownShown.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', closeDropdownOnOutsideClick)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', closeDropdownOnOutsideClick)
})

const isUnique = computed(() => route.query.isunique === 'true')
const excludeFile = computed(() => route.query.excludefile === 'true')
const editOnly = computed(() => route.query.editonly === 'true')

const { data, error, pending } = await useFetch('/api/recentchanges', {
    key: computed(() => `/RecentChanges:${show.value}:${isUnique.value}:${excludeFile.value}:${editOnly.value}`),
    query: computed(() => ({
        show: show.value,
        isunique: isUnique.value ? 'true' : undefined,
        excludefile: excludeFile.value ? 'true' : undefined,
        editonly: editOnly.value ? 'true' : undefined,
    })),
})

const isError = computed(() => !pending.value && (!!error.value || data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('pages.recentChanges.dataLoadError')))

const decodeSanitizedField = value => String(value ?? '').replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g,
    entity => entityMap[entity]
)

const changes = computed(() => {
    if (!Array.isArray(data.value)) return []
    return data.value.map(change => ({
        ...change,
        page: decodeSanitizedField(change.page),
        doneBy: decodeSanitizedField(change.doneBy),
        comment: decodeSanitizedField(change.comment),
    }))
})

const byteChangeClass = (bytechange) => {
    const value = Number(bytechange || 0)
    if (value > 0) return 'text-success'
    if (value === 0) return 'text-secondary'
    return 'text-danger'
}

const formatByteChange = (bytechange) => {
    const value = Number(bytechange || 0)
    if (value > 0) return `+${value}`
    return String(value)
}

const actionI18nKeys = {
    edit: 'pages.recentChanges.actions.edit',
    delete: 'pages.recentChanges.actions.delete',
    create: 'pages.recentChanges.actions.create',
    upload: 'pages.recentChanges.actions.upload',
    move: 'pages.recentChanges.actions.move',
    revert: 'pages.recentChanges.actions.revert',
    protect: 'pages.recentChanges.actions.protect',
}

const actionI18nLookup = type => actionI18nKeys[type] ?? 'pages.recentChanges.actions.unknown'

const formatDate = value => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    return new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date)
}

const pageLink = page => `/w/${page}`
const revisionLink = change => `/w/${change.page}?rev=${change.rev}`

const linkWithQuery = nextQuery => ({
    path: route.path,
    query: {
        ...route.query,
        ...nextQuery,
    },
})

const toggleBooleanQuery = async (key, checked) => {
    const query = { ...route.query }
    if (checked) query[key] = 'true'
    else delete query[key]

    await navigateTo({
        path: route.path,
        query,
    })
}

useHeadSafe(computed(() => ({
    title: `${t('pages.recentChanges.title')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('pages.recentChanges.error') : t('pages.recentChanges.title'),
})

applyHeader()
watch([data, error], applyHeader)
</script>

<style scoped>
.recent-changes-toolbar {
    margin-bottom: 0.75rem;
}

#recentChangesOptionsMenu {
    width: 18rem;
    padding: 0.5rem 1rem;
}

.recent-changes-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0;
}

.recent-changes-table-wrap {
    min-height: 100vh;
    overflow-x: auto;
}

.recent-changes-table {
    min-width: 100%;
}

.recent-changes-page-col {
    min-width: 40%;
}

.recent-changes-user-col,
.recent-changes-action-col {
    min-width: 64px;
}

.recent-changes-date-col {
    min-width: 100px;
}

.recent-changes-cell {
    overflow-wrap: anywhere;
}

fieldset {
    all: revert;
}

legend {
    all: revert;
}
</style>
