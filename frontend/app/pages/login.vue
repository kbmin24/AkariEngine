<template>
    <div v-if="store.isLoggedIn">
        <div class="alert alert-danger" role="alert">
            {{ $t('auth.login.alreadyLoggedIn') }}
        </div>
        <i18n-t keypath="common.actions.returningTo" tag="div">
            <template #link>
                <NuxtLink to="/">{{ $t('common.pages.mainpage') }}</NuxtLink>
            </template>
        </i18n-t>
    </div>
    <template v-else>
        <div v-if="errorKey" class="alert alert-danger" role="alert" v-html="t(errorKey)"></div>
        <div class="mx-auto p-3" style="max-width: 400px;">
            <form @submit.prevent="onSubmit">
                <div class="mb-3">
                    <label for="loginId" class="form-label">{{ $t('auth.login.inputID') }}</label>
                    <input id="loginId" v-model="id" type="text" class="form-control" autocomplete="username" required
                        :disabled="pending" />
                </div>
                <div class="mb-3">
                    <label for="loginPw" class="form-label">{{ $t('auth.login.inputPW') }}</label>
                    <input id="loginPw" v-model="password" type="password" class="form-control"
                        autocomplete="current-password" required :disabled="pending" />
                </div>
                <div v-if="data?.captcha" class="mt-2 mb-2">
                    <Turnstile ref="turnstile" :siteKey="data.captcha" />
                </div>
                <button type="submit" class="btn btn-primary w-100" :disabled="pending">
                    {{ $t('auth.login.submit') }}
                </button>
            </form>
            <p class="mt-3 mb-1 text-muted small">
                {{ $t('auth.login.noAccount') }}
                <NuxtLink to="/signup">{{ $t('auth.login.accountNow') }}</NuxtLink>
            </p>
            <p class="text-muted small">
                <i18n-t keypath="auth.login.pwForgot" tag="span">
                    <template #link>
                        <a :href="`mailto:${config.public.adminEmail}`">{{ $t('auth.login.adminEmail') }}</a>
                    </template>
                </i18n-t>
            </p>
        </div>
    </template>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { csrfFetch } = useCsrf()
const { fetchMe } = useAuth()
const router = useRouter()
const store = useUserStore()

useHead({ title: `${t('auth.login.title')} - ${config.public.appname}` })
const { setPageHeader } = usePageHeader()
setPageHeader({ title: t('auth.login.title') })

const { data } = await useFetch(
    () => `/api/login`,
    {
        key: `/login`,
    }
)


const turnstile = ref(null)
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

        // Should be empty in private mode so we're trying hard refresh
        await refreshNuxtData('recent-changes-sidebar')
        await router.push('/')
    } catch (err) {
        errorKey.value = err.data?.i18nKey ?? 'error'
        turnstile.value?.reset()
    } finally {
        pending.value = false
    }
}
</script>
