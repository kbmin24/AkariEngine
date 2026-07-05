<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams"
            :message="errorMessageFallback" tag="p" />
    </div>
    <form v-else-if="selectUser" @submit.prevent="selectUsername">
        <div class="mb-3 row">
            <label for="tbUsername" class="col-sm-2 col-form-label">{{ $t('username') }}</label>
            <div class="col-sm-10">
                <input id="tbUsername" v-model="usernameInput" type="text" maxlength="255"
                    class="form-control" required>
            </div>
        </div>
        <p><span class="text-warning fw-bold">{{ $t('warning') }}</span> {{ $t('loginHistoryAuditWarning') }}</p>
        <div class="mt-3">
            <button type="submit" class="btn btn-primary" :disabled="!usernameInput.trim()">
                {{ $t('loginhistory') }}
            </button>
        </div>
    </form>
    <div v-else style="overflow-x: auto">
        <p>{{ $t('loginHistoryRetentionNotice') }}</p>
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{{ $t('datetime') }}</th>
                    <th scope="col">{{ $t('ipAddress') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="record in records" :key="record.id ?? `${record.date}:${record.dataValues.ipaddr}`">
                    <td>{{ record.date }}</td>
                    <td>{{ record.dataValues.ipaddr }}</td>
                </tr>
                <tr v-if="records.length === 0">
                    <td colspan="2">{{ $t('noResults') }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
definePageMeta({
    key: route => route.fullPath,
})

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const selectedUser = computed(() => typeof route.query.user === 'string' ? route.query.user : '')
const usernameInput = ref(selectedUser.value)

const { data, error, pending } = await useAkariFetch('/api/admin/loginhistory', {
    key: computed(() => `/admin/loginhistory:${selectedUser.value}`),
    query: computed(() => ({
        user: selectedUser.value || undefined,
    })),
})

const selectUser = computed(() => data.value?.selectUser ?? !selectedUser.value)
const records = computed(() => Array.isArray(data.value?.records) ? data.value.records : [])
const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('dataLoadError')))
const headerTitle = computed(() => selectUser.value
    ? t('loginHistoryUsernameSelect')
    : t('loginHistoryOf', { username: selectedUser.value }))

console.log(records.value)

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
        query: { user: username },
    })
}
</script>
