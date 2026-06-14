<template>
    <div>
        <SkinSettingsCard v-if="store.isLoggedIn && availableSkins.length > 0" :skins="availableSkins" />
        <PasswordSettingsCard v-if="store.isLoggedIn" />
    </div>
</template>

<script setup>
import SkinSettingsCard from './SkinSettingsCard.vue'
import PasswordSettingsCard from './PasswordSettingsCard.vue'

const config = useRuntimeConfig()
const { store } = useAuth()

const availableSkins = computed(() => config.public.availableSkins || [])
</script>
