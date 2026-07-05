<script setup>
const { csrfFetch, invalidate } = useCsrf()
const { fetchMe } = useAuth()

await csrfFetch('/api/logout', { method: 'POST' })
invalidate() // invalidate CSRF token (since the user isn't even logged in)
await fetchMe()
await navigateTo('/')
</script>