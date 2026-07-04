<template>
    <div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title">{{ $t('auth.passwordChange.title') }}</h5>
            <p class="card-text">{{ $t('auth.passwordChange.description') }}</p>

            <div v-if="success" class="alert alert-success" role="alert">{{ $t('auth.passwordChange.done') }}</div>
            <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

            <form @submit.prevent="onSubmit">
                <div class="form-group mb-2">
                    <label for="oldpassword">{{ $t('auth.passwordChange.currentPassword') }}</label>
                    <input id="oldpassword" v-model="oldpassword" type="password" name="oldpassword"
                        class="form-control" :placeholder="$t('auth.passwordChange.currentPasswordInput')" required :disabled="pending"
                        autocomplete="current-password">
                </div>

                <div class="form-group mb-2">
                    <label for="passwordInputbox">{{ $t('auth.passwordChange.newPassword') }}</label>
                    <input id="passwordInputbox" v-model="password" type="password" name="password"
                        class="form-control" :placeholder="$t('auth.passwordChange.newPasswordInput')" required minlength="8" maxlength="255"
                        pattern="^[A-Za-z\d$@$!%*?&^#_\-+=<>,./|]{8,255}$" :disabled="pending"
                        autocomplete="new-password">
                    <small class="form-text text-muted">{{ $t('auth.passwordChange.p8up') }}</small>
                    <small v-if="pwBadLength" class="text-danger fw-bold d-block">
                        {{ $t('auth.passwordChange.illegalpwlength') }}
                    </small>
                    <small v-if="pwBadChars.size > 0" class="text-danger fw-bold d-block">
                        {{ $t('auth.passwordChange.illegalpwchar') }}'{{ Array.from(pwBadChars).join("', '") }}'
                    </small>
                </div>

                <div class="form-group mb-2">
                    <label for="passwordConfirmInputbox">{{ $t('auth.passwordChange.confirmPassword') }}</label>
                    <input id="passwordConfirmInputbox" v-model="passwordConfirm" type="password"
                        name="passwordConfirm" class="form-control" :placeholder="$t('auth.passwordChange.newPasswordInput')" required
                        minlength="8" maxlength="255" :disabled="pending" autocomplete="new-password">
                    <p>
                        <small v-if="pwMatch === true" class="text-success fw-bold">
                            {{ $t('auth.passwordChange.pwMatch') }}
                        </small>
                        <small v-else-if="pwMatch === false" class="text-danger fw-bold">
                            {{ $t('auth.passwordChange.pwNotMatch') }}
                        </small>
                    </p>
                    <small class="form-text text-muted">{{ $t('auth.passwordChange.confirmPwDesc') }}</small>
                </div>

                <button type="submit" class="btn btn-primary" :disabled="!formValid || pending">
                    {{ $t('auth.passwordChange.title') }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
const { t } = useI18n()
const { csrfFetch } = useCsrf()

const GOOD_CHARS = /^[A-Za-z\d@$!%*?&^#_\-+=<>,./|]$/

const oldpassword = ref('')
const password = ref('')
const passwordConfirm = ref('')
const pending = ref(false)
const success = ref(false)
const errorMessage = ref('')

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

const formValid = computed(() =>
    oldpassword.value.length > 0 &&
    password.value.length > 0 &&
    !pwBadLength.value &&
    pwBadChars.value.size === 0 &&
    pwMatch.value === true
)

const onSubmit = async () => {
    success.value = false
    errorMessage.value = ''
    pending.value = true
    try {
        await csrfFetch('/api/settings/changePassword', {
            method: 'POST',
            body: {
                oldpassword: oldpassword.value,
                password: password.value,
                passwordConfirm: passwordConfirm.value,
            },
        })
        oldpassword.value = ''
        password.value = ''
        passwordConfirm.value = ''
        success.value = true
    } catch (err) {
        errorMessage.value = err.data?.i18nKey ? t(err.data.i18nKey) : (err.data?.message || t('error'))
    } finally {
        pending.value = false
    }
}
</script>
