<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams"
            :message="errorMessageFallback" tag="p" />
    </div>
    <div v-else>
        <div v-if="submitError" class="alert alert-danger" role="alert">
            <LocalizedMessage :keypath="submitErrorKey" :params="submitErrorParams"
                :message="submitErrorFallback" />
        </div>
        <div v-if="saved" class="alert alert-success" role="status">{{ $t('auth.block.user.done') }}</div>

        <form @submit.prevent="blockUser">
            <div class="mb-3 row">
                <label for="tbUsername" class="col-sm-2 col-form-label">{{ $t('auth.block.user.username') }}</label>
                <div class="col-sm-10">
                    <input id="tbUsername" v-model="target" type="text" maxlength="255"
                        class="form-control" required>
                </div>
            </div>

            <div class="mb-3 row">
                <label for="tbTime" class="col-sm-2 col-form-label">{{ $t('auth.block.user.blockFor') }}</label>
                <div class="col-sm-10">
                    <select id="tbTime" v-model="blockFor" class="form-select"
                        :aria-label="$t('auth.block.user.blockFor')" required>
                        <option v-for="option in blockDurationOptions" :key="option.value"
                            :value="option.value">
                            {{ $t(option.labelKey) }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="mb-3 row">
                <label for="tbComment" class="col-sm-2 col-form-label">{{ $t('auth.block.user.comment') }}</label>
                <div class="col-sm-10">
                    <input id="tbComment" v-model="comment" type="text" maxlength="255"
                        class="form-control">
                </div>
            </div>

            <div class="mt-3">
                <button type="submit" class="btn btn-primary"
                    :disabled="submitting || !target.trim()">
                    {{ $t('auth.block.user.submit') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
const blockDurationOptions = [
    { value: 'unblock', labelKey: 'auth.block.user.duration.unblock' },
    { value: '1', labelKey: 'auth.block.user.duration.oneSecond' },
    { value: '60', labelKey: 'auth.block.user.duration.oneMinute' },
    { value: '300', labelKey: 'auth.block.user.duration.fiveMinutes' },
    { value: '600', labelKey: 'auth.block.user.duration.tenMinutes' },
    { value: '3600', labelKey: 'auth.block.user.duration.oneHour' },
    { value: '7200', labelKey: 'auth.block.user.duration.twoHours' },
    { value: '21600', labelKey: 'auth.block.user.duration.sixHours' },
    { value: '43200', labelKey: 'auth.block.user.duration.twelveHours' },
    { value: '86400', labelKey: 'auth.block.user.duration.oneDay' },
    { value: '259320', labelKey: 'auth.block.user.duration.threeDays' },
    { value: '432000', labelKey: 'auth.block.user.duration.fiveDays' },
    { value: '604800', labelKey: 'auth.block.user.duration.oneWeek' },
    { value: '864000', labelKey: 'auth.block.user.duration.tenDays' },
    { value: '1209600', labelKey: 'auth.block.user.duration.twoWeeks' },
    { value: '1814400', labelKey: 'auth.block.user.duration.threeWeeks' },
    { value: '2419200', labelKey: 'auth.block.user.duration.oneMonth' },
    { value: '3628800', labelKey: 'auth.block.user.duration.sixWeeks' },
    { value: '4838400', labelKey: 'auth.block.user.duration.twoMonths' },
    { value: '7257600', labelKey: 'auth.block.user.duration.threeMonths' },
    { value: '14515200', labelKey: 'auth.block.user.duration.sixMonths' },
    { value: '29030400', labelKey: 'auth.block.user.duration.oneYear' },
    { value: '58060800', labelKey: 'auth.block.user.duration.twoYears' },
    { value: 'forever', labelKey: 'auth.block.user.duration.forever' },
]

const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const target = ref('')
const blockFor = ref('unblock')
const comment = ref('')
const submitting = ref(false)
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorFallback = ref('')
const saved = ref(false)
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorFallback.value)

const { data, error, pending } = await useFetch('/api/admin/blockuser')

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('auth.block.user.dataLoadError')))

useHeadSafe(computed(() => ({
    title: `${t('auth.block.user.title')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('auth.block.user.error') : t('auth.block.user.title'),
})

applyHeader()
watch([data, error], applyHeader)

const blockUser = async () => {
    submitting.value = true
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorFallback.value = ''
    saved.value = false

    try {
        await csrfFetch('/api/admin/blockuser', {
            method: 'POST',
            body: {
                target: target.value.trim(),
                blockfor: blockFor.value,
                comment: comment.value,
            },
        })
        saved.value = true
    } catch (requestError) {
        submitErrorKey.value = requestError?.data?.i18nKey || null
        submitErrorParams.value = requestError?.data?.i18nParams ?? {}
        submitErrorFallback.value = requestError?.data?.i18nKey
            ? ''
            : (requestError?.data?.message ?? t('auth.block.user.error'))
    } finally {
        submitting.value = false
    }
}
</script>
