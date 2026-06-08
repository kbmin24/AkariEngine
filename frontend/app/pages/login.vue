<template>
    <div v-if="errorKey" class="alert alert-danger" role="alert" v-html="t(errorKey)"></div>

    <div class="mx-auto p-3" style="max-width: 400px;">
        <form @submit.prevent="onSubmit">
            <div class="mb-3">
                <label for="loginId" class="form-label">{{ $t('login_inputID') }}</label>
                <input id="loginId" v-model="id" type="text" class="form-control" autocomplete="username" required
                    :disabled="pending" />
            </div>
            <div class="mb-3">
                <label for="loginPw" class="form-label">{{ $t('login_inputPW') }}</label>
                <input id="loginPw" v-model="password" type="password" class="form-control"
                    autocomplete="current-password" required :disabled="pending" />
            </div>
            <div v-if="data?.captcha" class="mt-2 mb-2">
                <Turnstile :siteKey="data.captcha" />
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="pending">
                {{ $t('login') }}
            </button>
        </form>
        <p class="mt-3 mb-1 text-muted small">
            {{ $t('login_noAccount') }}
            <NuxtLink to="/signup">{{ $t('login_accountNow') }}</NuxtLink>
        </p>
        <p class="text-muted small">
            {{ $t('login_pwforgot') }}
            <a :href="`mailto:${config.public.adminEmail}`">{{ $t('login_adminEmail') }}</a>
        </p>
    </div>
</template>

<script setup>
definePageMeta({ layout: 'gec-wiki' })

const { t } = useI18n()
const config = useRuntimeConfig()
const { csrfFetch } = useCsrf()
const { fetchMe } = useAuth()
const router = useRouter()

useHead({ title: `${t('login')} - ${config.public.appname}` })
const { setPageHeader } = usePageHeader()
setPageHeader({ title: t('login') })

const { data } = await useFetch(
    () => `/api/login`,
    {
        key: `/login`,
    }
)


const id = ref('')
const password = ref('')
const errorKey = ref(null)
const pending = ref(false)

const onSubmit = async () => {
    errorKey.value = null
    pending.value = true
    const captchaResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value
    try {
        await csrfFetch('/api/login', {
            method: 'POST',
            body: { id: id.value, password: password.value, 'cf-turnstile-response': captchaResponse },
        })
        await fetchMe()
        await router.push('/')
    } catch (err) {
        errorKey.value = err.data?.i18nKey ?? 'error'
    } finally {
        pending.value = false
    }
}
</script>
