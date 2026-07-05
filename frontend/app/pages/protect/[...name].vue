<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" tag="p" />
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else class="p-3">
        <div v-if="submitError" class="alert alert-danger" role="alert">
            <LocalizedMessage :keypath="submitErrorKey" :params="submitErrorParams" :message="submitErrorMessage" />
        </div>
        <div v-if="saved" class="alert alert-success" role="status">{{ $t('done') }}</div>

        <form @submit.prevent="submitProtect">
            <div v-for="task in protectionTasks" :key="task" class="form-group mb-2 row">
                <label :for="`${task}Select`" class="col-sm-2 col-form-label">
                    {{ $t(`pages.protect.tasks.${task}`) }}
                </label>
                <div class="col-sm-10">
                    <select :id="`${task}Select`" v-model="rules[task]" class="w-auto form-select"
                        :aria-label="$t('pages.protect.selectLabel', { task: $t(`pages.protect.tasks.${task}`) })"
                        :disabled="!data?.hasAcl || submitting">
                        <option v-for="level in protectionLevels" :key="level" :value="level">
                            {{ $t(`pages.protect.levels.${level}`) }}
                        </option>
                    </select>
                </div>
            </div>
            <button v-if="data?.hasAcl" type="submit" class="btn btn-primary mt-3" :disabled="submitting">
                {{ $t('save') }}
            </button>
        </form>
        <hr>
        <h3>{{ $t('adminTools.revAcl.title') }}</h3>
        <RevisionACLAdmin v-if="store.isAdmin" :pagename="pagename" />
        <RevisionACLView v-else :pagename="pagename" />
    </div>
</template>

<script setup>
import RevisionACLAdmin from '~/components/protect/RevisionACLAdmin.vue'
import RevisionACLView from '~/components/protect/RevisionACLView.vue'

definePageMeta({
    key: route => route.path,
})

const protectionTasks = ['read', 'edit', 'move']
const protectionLevels = ['everyone', 'blocked', 'login', 'admin']
const defaultRules = {
    read: 'blocked',
    edit: 'everyone',
    move: 'everyone',
}

const route = useRoute()
const store = useUserStore()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const rules = reactive({ ...defaultRules })
const submitting = ref(false)
const saved = ref(false)
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorMessage = ref('')
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorMessage.value)

const pagename = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(p => p !== '').join('/')
    return String(parts)
})

const { data, error, pending } = await useAkariFetch(
    () => `/api/protect/${pagename.value}`,
    {
        key: computed(() => `/protect/${pagename.value}`),
    }
)

const applyRules = (permissions = []) => {
    Object.assign(rules, defaultRules)
    for (const permission of permissions) {
        if (
            protectionTasks.includes(permission.task) &&
            protectionLevels.includes(permission.protectionLevel)
        ) {
            rules[permission.task] = permission.protectionLevel
        }
    }
}

watch(data, value => applyRules(value?.permissions ?? []), { immediate: true })

const isError = computed(() => (!pending.value && (!!error.value || !!data.value?.error)))
const errorI18nKey = computed(() => (error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'dataLoadError'))
const errorI18nParams = computed(() => (error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {}))
const pageTitle = computed(() => data.value?.title ?? pagename.value)
const headerTitle = computed(() => t('protectPage', { p: pageTitle.value }))

useHeadSafe(computed(() => ({
    title: `${headerTitle.value} - ${config.public.appname}`,
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('error') })
        return
    }

    setPageHeader({
        title: headerTitle.value,
        pagename: data.value?.pagename ?? pagename.value,
        isPage: true,
        pageMode: 'protect',
    })
}

applyHeader()
watch([data, error, pagename, headerTitle], applyHeader)

const submitProtect = async () => {
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorMessage.value = ''
    saved.value = false
    submitting.value = true

    try {
        await csrfFetch(`/api/protect/${pagename.value}`, {
            method: 'POST',
            body: { ...rules },
        })
        saved.value = true
        await refreshNuxtData(`/protect/${pagename.value}`)
    } catch (e) {
        submitErrorKey.value = e?.data?.i18nKey || null
        submitErrorParams.value = e?.data?.i18nParams ?? {}
        submitErrorMessage.value = e?.data?.i18nKey ? '' : (e?.data?.message ?? t('error'))
    } finally {
        submitting.value = false
    }
}
</script>
