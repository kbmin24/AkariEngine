export default defineNuxtRouteMiddleware((to) => {
    const { setPageHeader } = usePageHeader()
    const parts = to.params.name
    const pagename = Array.isArray(parts)
        ? parts.filter(p => p !== '').join('/')
        : String(parts ?? '')
    if (pagename) setPageHeader({ title: pagename })
})
