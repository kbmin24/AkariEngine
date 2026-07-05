<!--
Non-admin component to view revision-specific ACLs.
Refer to the `RevisionACLAdmin.vue` for the admin version, including add/remove functionality.
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
                </tr>
            </thead>
            <tbody>
                <tr v-if="!pending && revisionRules.length === 0">
                    <td colspan="2">{{ $t('adminTools.revAcl.noRules') }}</td>
                </tr>
                <tr v-for="rule in revisionRules" :key="`${rule.revision}:${rule.task}`">
                    <th scope="row">r{{ rule.revision }}</th>
                    <td>{{ aclLevelLabel(rule.protectionLevel) }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
const { pagename } = defineProps({
    pagename: {
        type: String,
        required: true,
    },
})
const { t, te } = useI18n()

const submitError = ref('')

const { data, error, pending } = await useAkariFetch(
    () => `/api/revision-acl/${pagename}`, {
        key: computed(() => `/revision-acl/${pagename}`),
        default: () => ({ permissions: [] }),
    }
)
const revisionRules = computed(() => data.value?.permissions ?? [])
const loadError = computed(() => !!error.value)
const aclLevelLabel = level => {
    const key = `pages.protect.levels.${level}`
    return te(key) ? t(key) : level
}

</script>
