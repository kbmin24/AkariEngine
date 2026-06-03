const SKIN_LAYOUT_MAP = {
    GECWiki: 'GECWiki',
}
const DEFAULT_LAYOUT = 'GECWiki'

export const useSkin = () => {
    const store = useUserStore()
    const layoutName = computed(() => SKIN_LAYOUT_MAP[store.skin] ?? DEFAULT_LAYOUT)
    return { layoutName }
}
