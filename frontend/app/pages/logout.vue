<script setup>
definePageMeta({ layout: 'gec-wiki' })

const { csrfFetch, invalidate } = useCsrf()
const { store } = useAuth()

await csrfFetch('/api/logout', { method: 'POST' })
store.clearUser()
invalidate() // invalidate CSRF token (since the user isn't even logged in)
await navigateTo('/')
</script>