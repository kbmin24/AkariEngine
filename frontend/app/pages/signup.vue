<template>
    <div v-if="success">
        <i18n-t keypath="register_done" tag="span">
            <template #loginlink>
                <NuxtLink to="/login">{{ $t('log_in_l') }}</NuxtLink>
            </template>
        </i18n-t>
    </div>

    <div v-else class="mx-auto p-3" style="max-width: 500px;">
        <div v-if="errorKey" class="alert alert-danger" role="alert" v-html="t(errorKey)"></div>

        <form @submit.prevent="onSubmit">
            <div class="form-group mb-2">
                <label for="idInputbox">{{ $t('id') }}</label>
                <input id="idInputbox" v-model="id" type="text" minlength="3" maxlength="255" class="form-control"
                    :placeholder="$t('register_enterid')" required :disabled="pending" />
                <p>
                    <small v-if="idStatus === 'ok' && idAvailable === true" class="text-success fw-bold">{{
                        $t('register_idok') }}</small>
                    <small v-else-if="idStatus === 'bad'" class="text-danger fw-bold">{{ $t('register_idillegal')
                    }}</small>
                    <small v-if="idAvailable === false" class="text-danger fw-bold">{{ $t('register_idexists')
                    }}</small>
                </p>
            </div>

            <div class="form-group mb-2">
                <label for="passwordInputbox">{{ $t('password') }}</label>
                <input id="passwordInputbox" v-model="password" type="password" class="form-control"
                    :placeholder="$t('register_enterpw')" required minlength="8" maxlength="255" :disabled="pending"
                    pattern="^[A-Za-z\d$@$!%*?&^#_\-+=<>,./|]{8,255}$" />
                <small class="form-text text-muted">{{ $t('register_p8up') }}</small>
                <small v-if="pwBadLength" class="text-danger fw-bold d-block">{{ $t('register_illegalpwlength')
                }}</small>
                <small v-if="pwBadChars.size > 0" class="text-danger fw-bold d-block">
                    {{ $t('register_illegalpwchar') }}'{{ Array.from(pwBadChars).join("', '") }}'
                </small>
            </div>

            <div class="form-group mb-2">
                <label for="passwordConfirmInputbox">{{ $t('register_confirmpw') }}</label>
                <input id="passwordConfirmInputbox" v-model="passwordConfirm" type="password" class="form-control"
                    :placeholder="$t('register_reenterpw')" required minlength="8" maxlength="255"
                    :disabled="pending" />
                <p>
                    <small v-if="pwMatch === true" class="text-success fw-bold">{{ $t('register_pwMatch') }}</small>
                    <small v-else-if="pwMatch === false" class="text-danger fw-bold">{{ $t('register_pwNotMatch')
                    }}</small>
                </p>
                <small class="form-text text-muted">{{ $t('register_confirmPwDesc') }}</small>
            </div>

            <template v-if="config.public.privacyPolicy && config.public.tos">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="ppTosAgree" v-model="ppTosAgree"
                        :disabled="pending" />
                    <label class="form-check-label" for="ppTosAgree">
                        <i18n-t keypath="register_agreeToTwo">
                            <template #link1>
                                <button type="button" class="btn btn-link p-0 align-baseline"
                                    data-bs-toggle="modal" data-bs-target="#ppModal">
                                    {{ $t('register_privacyPolicy') }}
                                </button>
                            </template>
                            <template #link2>
                                <button type="button" class="btn btn-link p-0 align-baseline"
                                    data-bs-toggle="modal" data-bs-target="#tosModal">
                                    {{ $t('register_termsOfService') }}
                                </button>
                            </template>
                        </i18n-t>
                    </label>
                </div>
            </template>

            <div v-if="data?.captcha" class="mt-2 mb-2">
                <Turnstile :siteKey="data.captcha" />
            </div>

            <button type="submit" class="btn btn-primary" :disabled="!registerGood || pending">{{ $t('register')
            }}</button>
        </form>
    </div>

    <div v-if="config.public.privacyPolicy" id="ppModal" class="modal" tabindex="-1">
        <div class="modal-dialog modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ $t('register_privacyPolicy') }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('close')" />
                </div>
                <div class="modal-body" v-html="config.public.privacyPolicy" />
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t('close') }}</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="config.public.tos" id="tosModal" class="modal" tabindex="-1">
        <div class="modal-dialog modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ $t('register_termsOfService') }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('close')" />
                </div>
                <div class="modal-body" v-html="config.public.tos" />
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t('close') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()

useHead({ title: `${t('register')} - ${config.public.appname}` })
const { setPageHeader } = usePageHeader()
setPageHeader({ title: t('register') })

const { data } = await useFetch('/api/signup', { key: '/signup' })

const id = ref('')
const password = ref('')
const passwordConfirm = ref('')
const errorKey = ref(null)
const success = ref(false)
const pending = ref(false)
const ppTosAgree = ref(false)

const GOOD_CHARS = /^[A-Za-z\d@$!%*?&^#_\-+=<>,./|]$/

const idStatus = computed(() => {
    if (!id.value) return null
    return /^\w{3,255}$/.test(id.value) ? 'ok' : 'bad'
})

const pwBadLength = computed(() =>
    password.value.length > 0 && (password.value.length < 8 || password.value.length > 255)
)

const pwBadChars = computed(() => {
    const bad = new Set()
    for (const c of password.value) {
        if (!GOOD_CHARS.test(c)) bad.add(c)
    }
    return bad
})

const pwMatch = computed(() => {
    if (!passwordConfirm.value) return null
    return password.value === passwordConfirm.value
})

const registerGood = computed(() =>
    idStatus.value === 'ok' &&
    idAvailable.value === true &&
    !pwBadLength.value &&
    pwBadChars.value.size === 0 &&
    pwMatch.value === true &&
    ((!config.public.privacyPolicy && !config.public.tos) || ppTosAgree.value !== false)
)

const idAvailable = ref(null)
let idCheckTimer = null

watch(id, (val) => {
    clearTimeout(idCheckTimer)
    if (idStatus.value !== 'ok') {
        idAvailable.value = null
        return
    }
    idCheckTimer = setTimeout(async () => {
        try {
            const { available } = await $fetch(`/api/user/exists?id=${encodeURIComponent(val)}`)
            idAvailable.value = available
            console.log(idAvailable.value)
        } catch {
            idAvailable.value = null
        }
    }, 300)
})

const onSubmit = async () => {
    errorKey.value = null
    pending.value = true
    const captchaResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value
    try {
        await $fetch('/api/signup', {
            method: 'POST',
            body: {
                id: id.value,
                password: password.value,
                passwordConfirm: passwordConfirm.value,
                'cf-turnstile-response': captchaResponse,
            },
        })
        success.value = true
    } catch (err) {
        errorKey.value = err.data?.i18nKey ?? 'error'
    } finally {
        pending.value = false
    }
}
</script>
