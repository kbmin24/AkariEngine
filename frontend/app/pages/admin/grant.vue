<template>
    <div v-if="isError" class="p-3">
        <p>{{ errorMessage }}</p>
    </div>
    <form v-else-if="selectUser" @submit.prevent="selectUsername">
        <div class="mb-3 row">
            <label for="tbUsername" class="col-sm-2 col-form-label">{{ $t('username') }}</label>
            <div class="col-sm-10">
                <input id="tbUsername" v-model="usernameInput" type="text" maxlength="255"
                    class="form-control" required>
            </div>
        </div>
        <div class="mt-3">
            <button type="submit" class="btn btn-primary" :disabled="!usernameInput.trim()">
                {{ $t('grant') }}
            </button>
        </div>
    </form>
    <div v-else>
        <div v-if="submitError" class="alert alert-danger" role="alert">{{ submitError }}</div>
        <div v-if="saved" class="alert alert-success" role="status">{{ $t('done') }}</div>

        <form @submit.prevent="savePermissions">
            <div v-for="permission in permissions" :key="permission" class="form-check form-check-inline">
                <input :id="`cb${permission}`" v-model="selectedPermissions" class="form-check-input"
                    type="checkbox" :value="permission">
                <label class="form-check-label" :for="`cb${permission}`">{{ permission }}</label>
            </div>
            <div class="mt-3">
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                    {{ $t('save') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const permissions = [
    'admin',
    'board',
    'block',
    'grant',
    'acl',
    'purgepage',
    'developer',
    'loginhistory',
    'bypasscaptcha',
    'thread',
]

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const grantTo = computed(() => typeof route.query.grantTo === 'string' ? route.query.grantTo : '')
const usernameInput = ref(grantTo.value)
const selectedPermissions = ref([])
const submitting = ref(false)
const submitError = ref(null)
const saved = ref(false)

const { data, error, pending } = await useFetch('/api/admin/grant', {
    key: computed(() => `/admin/grant:${grantTo.value}`),
    query: computed(() => ({
        grantTo: grantTo.value || undefined,
    })),
})

selectedPermissions.value = (data.value?.permissions ?? [])
    .filter(permission => permissions.includes(permission))

const selectUser = computed(() => data.value?.selectUser ?? !grantTo.value)
const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorMessage = computed(() => {
    const details = error.value?.data ?? data.value
    return details?.i18nKey
        ? t(details.i18nKey, details.i18nParams ?? {})
        : (details?.message ?? t('dataLoadError'))
})
const headerTitle = computed(() => selectUser.value
    ? t('selectUsernameToGrantTo')
    : t('grantTo', { username: grantTo.value }))

useHeadSafe(computed(() => ({
    title: `${headerTitle.value} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : headerTitle.value,
})

applyHeader()
watch([data, error, headerTitle], applyHeader)

const selectUsername = async () => {
    const username = usernameInput.value.trim()
    if (!username) return

    await navigateTo({
        path: route.path,
        query: { grantTo: username },
    })
}

const savePermissions = async () => {
    submitting.value = true
    submitError.value = null
    saved.value = false

    try {
        const body = { grantTo: grantTo.value }
        for (const permission of selectedPermissions.value) {
            if (permissions.includes(permission)) body[permission] = permission
        }

        await csrfFetch('/api/admin/grant', {
            method: 'POST',
            body,
        })
        saved.value = true
    } catch (requestError) {
        submitError.value = requestError?.data?.i18nKey
            ? t(requestError.data.i18nKey, requestError.data.i18nParams ?? {})
            : (requestError?.data?.message ?? t('error'))
    } finally {
        submitting.value = false
    }
}
</script>
