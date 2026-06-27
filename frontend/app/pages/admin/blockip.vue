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
        <div v-if="saved" class="alert alert-success" role="status">{{ $t('auth.block.ip.done') }}</div>

        <form @submit.prevent="blockIp">
            <div class="mb-3 row">
                <label for="tbIpAddress" class="col-sm-2 col-form-label">{{ $t('auth.block.ip.target') }}</label>
                <div class="col-sm-10">
                    <input id="tbIpAddress" v-model="target" type="text" maxlength="255"
                        class="form-control" :class="targetValidationClass" required
                        aria-describedby="ipAddressHelp ipAddressFeedback">
                    <small id="ipAddressHelp" class="form-text text-muted">
                        {{ $t('auth.block.ip.targetHelp') }}
                    </small>
                    <small v-if="target.trim()" id="ipAddressFeedback" class="d-block fw-bold"
                        :class="isValidTarget ? 'text-success' : 'text-danger'">
                        {{ isValidTarget ? $t('auth.block.ip.validCIDR') : $t('auth.block.ip.invalidCIDR') }}
                    </small>
                </div>
            </div>

            <div class="mb-3 row">
                <label for="tbTime" class="col-sm-2 col-form-label">{{ $t('auth.block.ip.blockFor') }}</label>
                <div class="col-sm-10">
                    <select id="tbTime" v-model="blockFor" class="form-select"
                        :aria-label="$t('auth.block.ip.blockFor')" required>
                        <option v-for="option in blockDurationOptions" :key="option.value"
                            :value="option.value">
                            {{ $t(option.labelKey) }}
                        </option>
                    </select>
                    <small class="form-text text-muted">{{ $t('auth.block.ip.durationHelp') }}</small>
                </div>
            </div>

            <div v-if="showAllowLogin" class="mb-3 row">
                <div class="offset-sm-2 col-sm-10">
                    <div class="form-check">
                        <input id="chkAllowLogin" v-model="allowLogin" class="form-check-input"
                            type="checkbox">
                        <label class="form-check-label" for="chkAllowLogin">
                            {{ $t('auth.block.ip.allowLogin') }}
                        </label>
                    </div>
                </div>
            </div>

            <div class="mb-3 row">
                <label for="tbComment" class="col-sm-2 col-form-label">{{ $t('auth.block.ip.comment') }}</label>
                <div class="col-sm-10">
                    <input id="tbComment" v-model="comment" type="text" maxlength="255"
                        class="form-control">
                </div>
            </div>

            <div class="mt-3">
                <button type="submit" class="btn btn-primary"
                    :disabled="submitting || !isValidTarget">
                    {{ $t('auth.block.ip.submit') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
const blockDurationOptions = [
    { value: 'unblock', labelKey: 'auth.block.duration.unblock' },
    { value: '1', labelKey: 'auth.block.duration.oneSecond' },
    { value: '60', labelKey: 'auth.block.duration.oneMinute' },
    { value: '300', labelKey: 'auth.block.duration.fiveMinutes' },
    { value: '600', labelKey: 'auth.block.duration.tenMinutes' },
    { value: '3600', labelKey: 'auth.block.duration.oneHour' },
    { value: '7200', labelKey: 'auth.block.duration.twoHours' },
    { value: '21600', labelKey: 'auth.block.duration.sixHours' },
    { value: '43200', labelKey: 'auth.block.duration.twelveHours' },
    { value: '86400', labelKey: 'auth.block.duration.oneDay' },
    { value: '259320', labelKey: 'auth.block.duration.threeDays' },
    { value: '432000', labelKey: 'auth.block.duration.fiveDays' },
    { value: '604800', labelKey: 'auth.block.duration.oneWeek' },
    { value: '864000', labelKey: 'auth.block.duration.tenDays' },
    { value: '1209600', labelKey: 'auth.block.duration.twoWeeks' },
    { value: '1814400', labelKey: 'auth.block.duration.threeWeeks' },
    { value: '2419200', labelKey: 'auth.block.duration.oneMonth' },
    { value: '3628800', labelKey: 'auth.block.duration.sixWeeks' },
    { value: '4838400', labelKey: 'auth.block.duration.twoMonths' },
    { value: '7257600', labelKey: 'auth.block.duration.threeMonths' },
    { value: '14515200', labelKey: 'auth.block.duration.sixMonths' },
    { value: '29030400', labelKey: 'auth.block.duration.oneYear' },
    { value: '58060800', labelKey: 'auth.block.duration.twoYears' },
    { value: 'forever', labelKey: 'auth.block.duration.forever' },
]

const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { csrfFetch } = useCsrf()

const target = ref('')
const blockFor = ref('unblock')
const allowLogin = ref(false)
const comment = ref('')
const submitting = ref(false)
const submitErrorKey = ref(null)
const submitErrorParams = ref({})
const submitErrorFallback = ref('')
const saved = ref(false)
const submitError = computed(() => !!submitErrorKey.value || !!submitErrorFallback.value)
const showAllowLogin = computed(() => blockFor.value !== 'unblock')
const isValidTarget = computed(() => isValidCIDRInput(target.value))
const targetValidationClass = computed(() => {
    if (!target.value.trim()) return ''
    return isValidTarget.value ? 'is-valid' : 'is-invalid'
})

const { data, error, pending } = await useFetch('/api/admin/blockip')

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('auth.block.ip.dataLoadError')))

useHeadSafe(computed(() => ({
    title: `${t('auth.block.ip.title')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('auth.block.ip.error') : t('auth.block.ip.title'),
})

applyHeader()
watch([data, error], applyHeader)
watch(showAllowLogin, (visible) => {
    if (!visible) allowLogin.value = false
})

const isValidIPv4 = (value) => {
    const parts = value.split('.')
    return parts.length === 4 && parts.every((part) => {
        if (!/^\d+$/.test(part)) return false
        const octet = Number(part)
        return octet >= 0 && octet <= 255 && String(octet) === part
    })
}

const isValidHextet = value => /^[0-9a-fA-F]{1,4}$/.test(value)

const isValidIPv6 = (value) => {
    if (!value || value.includes(':::')) return false

    let address = value
    let embeddedIPv4Hextets = 0
    if (address.includes('.')) {
        const splitAt = address.lastIndexOf(':')
        if (splitAt === -1) return false

        const ipv4Tail = address.slice(splitAt + 1)
        if (!isValidIPv4(ipv4Tail)) return false

        address = address.slice(0, splitAt)
        embeddedIPv4Hextets = 2
    }

    const compressedParts = address.split('::')
    if (compressedParts.length > 2) return false

    const left = compressedParts[0] ? compressedParts[0].split(':') : []
    const right = compressedParts[1] ? compressedParts[1].split(':') : []
    if (![...left, ...right].every(isValidHextet)) return false

    const hextetCount = left.length + right.length + embeddedIPv4Hextets
    return compressedParts.length === 2 ? hextetCount < 8 : hextetCount === 8
}

const isValidCIDRInput = (value) => {
    const [address, prefix, extra] = value.trim().split('/')
    if (!address || !prefix || extra !== undefined || !/^\d+$/.test(prefix)) return false

    const prefixLength = Number(prefix)
    if (isValidIPv4(address)) return prefixLength >= 0 && prefixLength <= 32
    if (isValidIPv6(address)) return prefixLength >= 0 && prefixLength <= 128

    return false
}

const blockIp = async () => {
    if (!isValidTarget.value) return

    submitting.value = true
    submitErrorKey.value = null
    submitErrorParams.value = {}
    submitErrorFallback.value = ''
    saved.value = false

    try {
        await csrfFetch('/api/admin/blockip', {
            method: 'POST',
            body: {
                target: target.value.trim(),
                blockfor: blockFor.value,
                allowLogin: allowLogin.value,
                comment: comment.value,
            },
        })
        saved.value = true
    } catch (requestError) {
        submitErrorKey.value = requestError?.data?.i18nKey || null
        submitErrorParams.value = requestError?.data?.i18nParams ?? {}
        submitErrorFallback.value = requestError?.data?.i18nKey
            ? ''
            : (requestError?.data?.message ?? t('auth.block.ip.error'))
    } finally {
        submitting.value = false
    }
}
</script>
