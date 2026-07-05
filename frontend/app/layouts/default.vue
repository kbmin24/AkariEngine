<template>
    <component :is="SkinLayout">
        <slot />
    </component>
</template>

<script setup>
const SKINS = import.meta.glob('../../../skins/*/index.vue')
const DEFAULT_SKIN = 'GECWiki'

const config = useRuntimeConfig()
const store = useUserStore()
const { fetchMe } = useAuth()
const availableSkins = computed(() => config.public.availableSkins || [])
const availableSkinNames = computed(() => availableSkins.value.map((skin) => skin.name))
const fallbackSkin = computed(() => availableSkinNames.value.includes(DEFAULT_SKIN) ? DEFAULT_SKIN : (availableSkinNames.value[0] || DEFAULT_SKIN))

await useAsyncData('current-user', async () => await fetchMe() ?? { anonymous: true })

const cache = {}
function getSkin(name) {
    const requestedName = availableSkinNames.value.includes(name) ? name : fallbackSkin.value
    const key = `../../../skins/${requestedName}/index.vue`
    const fallbackKey = `../../../skins/${DEFAULT_SKIN}/index.vue`
    const loader = SKINS[key] ?? SKINS[fallbackKey]
    return cache[requestedName] ??= defineAsyncComponent(loader)
}

const SkinLayout = computed(() => getSkin(store.skin || fallbackSkin.value))
</script>
