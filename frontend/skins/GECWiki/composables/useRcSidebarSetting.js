import { useSkinSetting } from '#imports'

export const useRcSidebarSetting = () => {
    return useSkinSetting('rcsidebar', true, {
        skinName: 'GECWiki',
        legacyKey: 'RC',
    })
}
