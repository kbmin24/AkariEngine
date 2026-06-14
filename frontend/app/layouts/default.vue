<template>
    <component :is="SkinLayout">
        <slot />
    </component>
</template>

<script setup>
const SKINS = import.meta.glob('../../skins/*/index.vue')
const DEFAULT_SKIN = 'GECWiki'

const store = useUserStore()

const cache = {}
function getSkin(name) {
    const key = `../../skins/${name}/index.vue`
    const loader = SKINS[key] ?? SKINS[`../../skins/${DEFAULT_SKIN}/index.vue`]
    return cache[name] ??= defineAsyncComponent(loader)
}

const SkinLayout = computed(() => getSkin(store.skin || DEFAULT_SKIN))
</script>
