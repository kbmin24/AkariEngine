export function useRouterContent(elRef) {
    const router = useRouter()

    const onClick = (e) => {
        const a = e.target.closest('a[href]')
        if (!a) return
        const href = a.getAttribute('href')
        // External links have target="_blank" set by HTMLVisitor; let them through.
        // Also skip fragment-only links and anything with an explicit target.
        if (!href || a.target || href.startsWith('#')) return
        e.preventDefault()
        router.push(href)
    }

    onMounted(() => elRef.value?.addEventListener('click', onClick))
    onBeforeUnmount(() => elRef.value?.removeEventListener('click', onClick))
}
