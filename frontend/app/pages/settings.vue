<template>
    <div>
        <ul class="nav nav-tabs" id="settingsTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button id="global-settings-tab" class="nav-link" :class="{ active: activeTab === 'global' }"
                    type="button" role="tab" @click="activeTab = 'global'">
                    {{ $t('globalSettings') }}
                </button>
            </li>
            <li v-if="SkinSettingsComponent" class="nav-item" role="presentation">
                <button id="skin-settings-tab" class="nav-link" :class="{ active: activeTab === 'skin' }"
                    type="button" role="tab" @click="activeTab = 'skin'">
                    {{ $t('skinSettings') }}
                </button>
            </li>
        </ul>

        <div class="tab-content border border-top-0 px-2 py-3" id="settingsTabContent">
            <div id="global-settings-tab-pane" class="tab-pane fade"
                :class="{ 'show active': activeTab === 'global' }" role="tabpanel" tabindex="0">
                <GlobalSettings />
            </div>
            <div v-if="SkinSettingsComponent" id="skin-settings-tab-pane" class="tab-pane fade"
                :class="{ 'show active': activeTab === 'skin' }" role="tabpanel" tabindex="0">
                <component :is="SkinSettingsComponent" />
            </div>
        </div>
    </div>
</template>

<script setup>
import GlobalSettings from '~/components/settings/GlobalSettings.vue'

const { t } = useI18n()
const config = useRuntimeConfig()
const { store, fetchMe } = useAuth()
const SKIN_SETTINGS = import.meta.glob('../../skins/*/settings.vue')

useHead({ title: `${t('settings')} - ${config.public.appname}` })
const { setPageHeader } = usePageHeader()
setPageHeader({ title: t('settings') })

await fetchMe()

const activeTab = ref('global')
const SkinSettingsComponent = computed(() => {
    const skin = store.skin || 'GECWiki'
    const loader = SKIN_SETTINGS[`../../skins/${skin}/settings.vue`]
    return loader ? defineAsyncComponent(loader) : null
})

watch(SkinSettingsComponent, (component) => {
    if (!component && activeTab.value === 'skin') activeTab.value = 'global'
})
</script>
