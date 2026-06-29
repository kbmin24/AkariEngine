<template>
    <div>
        <h4>{{ $t('wikimgmttools') }}</h4>
        <ul>
            <li v-for="item in adminMenuItems" :key="item.href">
                <NuxtLink :to="item.href">{{ $t(item.titleKey) }}</NuxtLink>
            </li>
        </ul>
    </div>
</template>

<script setup>
const adminMenuItems = [
    { href: '/admin/grant', titleKey: 'grant' },
    { href: '/admin/blockuser', titleKey: 'blockUser' },
    { href: '/admin/blockip', titleKey: 'blockIpAddr' },
    { href: '/admin/loginhistory', titleKey: 'loginhistory' },
    { href: '/admin/developer', titleKey: 'devmenu' },
]

const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

useHead({ title: `${t('adminMenu')} - ${config.public.appname}` })
setPageHeader({ title: t('adminMenu') })

await useFetch('/api/admin')
</script>
