<!--
Admin-only component to view and edit revision-specific ACLs.
Refer to the `RevisionACLView.vue` for the general, read-only version.
-->
<template>
    <div>
        <div v-if="loadError" class="alert alert-danger" role="alert">
            {{ $t('adminTools.revAcl.loadError') }}
        </div>
        <div v-if="submitError" class="alert alert-danger" role="alert">
            {{ submitError }}
        </div>
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{{ $t('adminTools.revAcl.revision') }}</th>
                    <th scope="col">{{ $t('adminTools.revAcl.permission') }}</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="!pending && revisionRules.length === 0">
                    <td colspan="3">{{ $t('adminTools.revAcl.noRules') }}</td>
                </tr>
                <tr v-for="rule in revisionRules" :key="`${rule.revision}:${rule.task}`">
                    <th scope="row">r{{ rule.revision }}</th>
                    <td>{{ aclLevelLabel(rule.protectionLevel) }}</td>
                    <td class="text-end">
                        <button
                            type="button"
                            class="btn btn-link btn-sm p-0 text-secondary"
                            :aria-label="$t('adminTools.revAcl.removeRule', { revision: rule.revision })"
                            :disabled="submitting"
                            @click="removeRule(rule)"
                        >
                            <i class="fas fa-xmark" aria-hidden="true"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>

        <form class="mt-3" @submit.prevent="addRule">
            <div class="row g-2 align-items-end">
                <div class="col-sm-4">
                    <label for="revisionAclRevInput" class="form-label">
                        {{ $t('adminTools.revAcl.revision') }}
                    </label>
                    <input
                        id="revisionAclRevInput"
                        v-model="newRule.revision"
                        type="number"
                        min="1"
                        class="form-control"
                        required
                    >
                </div>
                <div class="col-sm-4">
                    <label for="revisionAclPermissionSelect" class="form-label">
                        {{ $t('adminTools.revAcl.permission') }}
                    </label>
                    <select
                        id="revisionAclPermissionSelect"
                        v-model="newRule.protectionLevel"
                        class="form-select"
                        required
                    >
                        <option v-for="level in protectionLevels" :key="level" :value="level">
                            {{ aclLevelLabel(level) }}
                        </option>
                    </select>
                </div>
                <div class="col-sm-4">
                    <button type="submit" class="btn btn-primary" :disabled="submitting">
                        {{ $t('adminTools.revAcl.apply') }}
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup>
const { pagename } = defineProps({
    pagename: {
        type: String,
        required: true,
    },
})
const store = useUserStore()
const { csrfFetch } = useCsrf()
const { t, te } = useI18n()

const protectionLevels = ['everyone', 'blocked', 'login', 'admin']
const newRule = reactive({
    revision: '',
    protectionLevel: 'blocked',
})
const submitting = ref(false)
const submitError = ref('')

const { data, error, pending } = await useFetch(
    () => `/api/admin/hiderev`, {
        key: computed(() => `/admin/hiderev/${pagename}`),
        query: computed(() => ({ p: pagename })),
        immediate: store.isAdmin,
        default: () => ({ permissions: [] }),
    }
)
const revisionRules = computed(() => data.value?.permissions ?? [])
const loadError = computed(() => !!error.value)
const aclLevelLabel = level => {
    const key = `pages.protect.levels.${level}`
    return te(key) ? t(key) : level
}
const hasRuleForRevision = revision => revisionRules.value.some(rule => Number(rule.revision) === Number(revision))

const handleSubmitError = e => {
    submitError.value = e?.data?.message ?? t('adminTools.revAcl.submitError')
}

const addRule = async () => {
    submitError.value = ''

    if (hasRuleForRevision(newRule.revision)) {
        submitError.value = t('adminTools.revAcl.duplicateRule')
        return
    }

    submitting.value = true

    try {
        await csrfFetch('/api/admin/hiderev', {
            method: 'POST',
            body: {
                pagename,
                rev: newRule.revision,
                level: newRule.protectionLevel,
            },
        })
        newRule.revision = ''
        await refreshNuxtData(`/admin/hiderev/${pagename}`)
    } catch (e) {
        handleSubmitError(e)
    } finally {
        submitting.value = false
    }
}

const removeRule = async rule => {
    submitError.value = ''
    submitting.value = true

    try {
        await csrfFetch('/api/admin/hiderev', {
            method: 'DELETE',
            body: {
                pagename,
                rev: rule.revision,
            },
        })
        await refreshNuxtData(`/admin/hiderev/${pagename}`)
    } catch (e) {
        handleSubmitError(e)
    } finally {
        submitting.value = false
    }
}
</script>
