export function useRouterContent(elRef) {
    const router = useRouter()

    const onClick = (e) => {
        const a = e.target.closest('a[href]')
        if (!a) return
        const href = a.getAttribute('href')
        if (!href || href.startsWith('#')) return

        const isExternal = a.dataset.isExternal === 'true'
        if (isExternal || a.target) return

        const origin = globalThis.location.origin
        const url = new URL(href, origin)
        if (url.origin !== origin) return

        e.preventDefault()
        router.push(url.pathname + url.search + url.hash)
    }

    onMounted(() => elRef.value?.addEventListener('click', onClick))
    onBeforeUnmount(() => elRef.value?.removeEventListener('click', onClick))
}
