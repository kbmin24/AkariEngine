<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorI18nKey" :params="errorI18nParams" tag="p" />
        <i18n-t keypath="returnInfo" tag="p">
            <template #link>
                <a href="#" @click.prevent="$router.back()">{{ $t('previousPage') }}</a>
            </template>
        </i18n-t>
    </div>
    <div v-else>
        <h2 class="mb-3">{{ threadTitle }}</h2>
        <div v-if="comments.length > 0" class="thread-comments">
            <ThreadComment v-for="(comment, index) in comments" :key="comment.id" :comment="comment"
                :number="index + 1" :current-username="data?.username" />
        </div>
        <p v-else class="text-secondary">{{ $t('pages.thread.noComments') }}</p>

        <div v-if="socketError" class="alert alert-danger" role="alert">{{ socketError }}</div>
        <form @submit.prevent="submitComment">
            <textarea v-model="message" class="form-control thread-reply" name="content" maxlength="10000"
                :placeholder="composerPlaceholder" :disabled="composerDisabled"></textarea>
            <button type="submit" class="btn btn-primary mt-3"
                :disabled="composerDisabled || submittingComment || message.trim().length === 0">
                {{ submittingComment ? $t('pages.thread.sending') : $t('pages.thread.send') }}
            </button>
        </form>
        <p v-if="!userStore.isLoggedIn" class="mt-3">
            <span class="text-danger fw-bold">{{ $t('warning') }}!</span>
            {{ $t('pages.thread.anonymousWarning') }}
        </p>

        <section v-if="data?.isAdmin" class="thread-admin">
            <hr>
            <h3>{{ $t('pages.thread.admin.title') }}</h3>
            <div v-if="adminError" class="alert alert-danger" role="alert">{{ adminError }}</div>
            <div v-if="adminSuccess" class="alert alert-success" role="status">{{ adminSuccess }}</div>

            <form class="thread-admin-panel p-3" @submit.prevent="changeCommentVisibility">
                <div class="mb-3 row">
                    <label for="threadNumber" class="col-sm-3 col-form-label">
                        {{ $t('pages.thread.admin.commentNumber') }}
                    </label>
                    <div class="col-sm-9 thread-number-input">
                        <input id="threadNumber" v-model.number="threadNumber" type="number" class="form-control"
                            min="1" required>
                    </div>
                </div>
                <div class="mb-3 form-check">
                    <input id="unhideComment" v-model="unhideComment" class="form-check-input" type="checkbox">
                    <label class="form-check-label" for="unhideComment">
                        {{ $t('pages.thread.admin.unhideComment') }}
                    </label>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="adminSubmitting">
                    {{ $t('pages.thread.admin.changeVisibility') }}
                </button>
            </form>

            <form class="thread-admin-panel p-3" @submit.prevent="changeThreadStatus">
                <div class="mb-3 form-check">
                    <input id="closeThread" v-model="closeThread" class="form-check-input" type="checkbox">
                    <label class="form-check-label" for="closeThread">
                        {{ $t('pages.thread.admin.closeThread') }}
                    </label>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="adminSubmitting">
                    {{ $t('pages.thread.admin.changeStatus') }}
                </button>
            </form>

            <form class="thread-admin-panel p-3" @submit.prevent="changeThreadTitle">
                <div class="row align-items-center">
                    <label for="newThreadTitle" class="col-sm-3 col-form-label">
                        {{ $t('pages.thread.admin.newTitle') }}
                    </label>
                    <div class="col-sm-9">
                        <input id="newThreadTitle" v-model="newThreadTitle" class="form-control" maxlength="255"
                            type="text" :placeholder="$t('pages.thread.admin.titlePlaceholder')" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary mt-3" :disabled="adminSubmitting">
                    {{ $t('pages.thread.admin.changeTitle') }}
                </button>
            </form>
        </section>
    </div>
</template>

<style scoped>
.thread-reply {
    height: 9.375rem;
}

.thread-admin-panel {
    margin-top: 1.25rem;
    border: 1px solid var(--bs-border-color);
}

.thread-number-input {
    max-width: 7rem;
}
</style>

<script setup>
definePageMeta({
    key: route => route.path
})

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()
const { store: userStore } = useAuth()
const { csrfFetch } = useCsrf()

const message = ref('')
const comments = ref([])
const socketReady = ref(false)
const socketError = ref(null)
const submittingComment = ref(false)
const commentPermission = ref({ hasPermission: false })
const threadNumber = ref(null)
const unhideComment = ref(false)
const closeThread = ref(false)
const newThreadTitle = ref('')
const adminSubmitting = ref(false)
const adminError = ref(null)
const adminSuccess = ref(null)

const roomId = computed(() => {
    const parts = route.params.name
    if (Array.isArray(parts)) return parts.filter(part => part !== '').join('/')
    return String(parts)
})

const { data, error, pending, refresh } = await useFetch(
    () => `/api/thread/${roomId.value}`,
    {
        key: computed(() => `/thread/${roomId.value}`)
    }
)

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorI18nKey = computed(() => error.value?.data?.i18nKey ?? data.value?.i18nKey ?? 'thread404')
const errorI18nParams = computed(() => error.value?.data?.i18nParams ?? data.value?.i18nParams ?? {})

const normalizeTextMessage = message => String(message ?? '').replace(/&#x2F;/gi, '/')

const localizedResponseMessage = response => {
    const details = response?.data ?? response
    if (details?.i18nKey) return normalizeTextMessage(t(details.i18nKey, details.i18nParams ?? {}))
    return normalizeTextMessage(details?.message ?? t('error'))
}

const pagename = computed(() => data.value?.pagename ?? '')
const threadTitle = computed(() => data.value?.thread?.threadTitle ?? roomId.value)
const isOpen = computed(() => data.value?.thread?.isOpen !== false)
const canComment = computed(() => commentPermission.value?.hasPermission === true)
const commentPermissionMessage = computed(() => {
    const permission = commentPermission.value
    if (permission?.i18nKey) return localizedResponseMessage(permission)
    return t('pages.thread.commentPermissionDenied')
})
const composerDisabled = computed(() => !isOpen.value || !socketReady.value || !canComment.value)
const composerPlaceholder = computed(() => {
    if (!isOpen.value) return t('pages.thread.closed')
    if (!canComment.value) return commentPermissionMessage.value
    return t('pages.thread.replyPlaceholder')
})

const mergeComments = (incoming = []) => {
    const merged = new Map(comments.value.map(comment => [comment.id, comment]))
    incoming.forEach(comment => merged.set(comment.id, comment))
    comments.value = [...merged.values()].sort((left, right) => Number(left.id) - Number(right.id))
}

watch(() => data.value?.comments, value => mergeComments(value ?? []), { immediate: true })
watch(() => data.value?.commentPermission, value => {
    if (value) commentPermission.value = value
}, { immediate: true })

useHeadSafe(computed(() => ({
    title: `${threadTitle.value} - ${config.public.appname}`
})))

const applyHeader = () => {
    if (isError.value) {
        setPageHeader({ title: t('error') })
        return
    }

    setPageHeader({
        title: pagename.value,
        titleInfo: t('pages.thread.titleInfo'),
        pagename: pagename.value,
        isPage: true,
        pageMode: 'discuss'
    })
}

applyHeader()
watch([data, error, threadTitle], applyHeader)

let socket = null
let componentActive = false

const handleThreadComment = comment => {
    if (comment?.threadID === roomId.value) mergeComments([comment])
}

const handleThreadUpdated = async update => {
    if (update?.threadID === roomId.value) await refresh()
}

const handleDisconnect = () => {
    socketReady.value = false
    socketError.value = t('pages.thread.connectionError')
}

const handleConnectError = connectError => {
    socketReady.value = false
    socketError.value = connectError?.message ?? t('pages.thread.connectionError')
}

const joinRoom = () => {
    if (!socket || !componentActive) return

    socket.emit('joinRoom', { roomId: roomId.value }, async result => {
        if (!componentActive) return
        if (!result?.success) {
            socketReady.value = false
            socketError.value = localizedResponseMessage(result)
            return
        }

        socketReady.value = true
        if (result.commentPermission) commentPermission.value = result.commentPermission
        socketError.value = null
        await refresh()
    })
}

onMounted(() => {
    componentActive = true
    socket = useSocket()
    if (!socket) {
        socketError.value = t('pages.thread.connectionError')
        return
    }

    socket.on('connect', joinRoom)
    socket.on('connect_error', handleConnectError)
    socket.on('disconnect', handleDisconnect)
    socket.on('threadComment', handleThreadComment)
    socket.on('threadUpdated', handleThreadUpdated)

    if (socket.connected) joinRoom()
})

onBeforeUnmount(() => {
    componentActive = false
    if (!socket) return

    socket.off('connect', joinRoom)
    socket.off('connect_error', handleConnectError)
    socket.off('disconnect', handleDisconnect)
    socket.off('threadComment', handleThreadComment)
    socket.off('threadUpdated', handleThreadUpdated)
    socket.emit('leaveRoom', { roomId: roomId.value })
})

const submitComment = async () => {
    const content = message.value.trim()
    if (!content || composerDisabled.value || !socket) return

    submittingComment.value = true
    socketError.value = null

    try {
        const result = await new Promise((resolve, reject) => {
            socket.timeout(10000).emit('postThreadComment', {
                roomId: roomId.value,
                message: content
            }, (timeoutError, response) => {
                if (timeoutError) reject(new Error(t('pages.thread.requestTimeout')))
                else resolve(response)
            })
        })

        if (!result?.success) {
            console.log(result)
            if (result?.permissionDenied) {
                commentPermission.value = {
                    hasPermission: false,
                    i18nKey: result.i18nKey,
                    i18nParams: result.i18nParams,
                    reason: result.message
                }
            }
            throw result
        }
        if (result.comment) mergeComments([result.comment])
        message.value = ''
    } catch (requestError) {
        if (!requestError?.permissionDenied) {
            socketError.value = localizedResponseMessage(requestError)
        }
    } finally {
        submittingComment.value = false
    }
}

const runAdminAction = async (url, body) => {
    adminSubmitting.value = true
    adminError.value = null
    adminSuccess.value = null

    try {
        await csrfFetch(url, { method: 'POST', body })
        await refresh()
        adminSuccess.value = t('pages.thread.admin.saved')
        return true
    } catch (requestError) {
        adminError.value = localizedResponseMessage(requestError)
        return false
    } finally {
        adminSubmitting.value = false
    }
}

const changeCommentVisibility = async () => {
    const succeeded = await runAdminAction('/api/admin/hidethread', {
        threadid: roomId.value,
        threadNo: threadNumber.value,
        unhide: unhideComment.value
    })
    if (succeeded) threadNumber.value = null
}

const changeThreadStatus = () => runAdminAction('/api/admin/changethreadstatus', {
    threadid: roomId.value,
    close: closeThread.value
})

const changeThreadTitle = async () => {
    const title = newThreadTitle.value.trim()
    if (!title) return

    const succeeded = await runAdminAction('/api/admin/changethreadname', {
        threadid: roomId.value,
        newtitle: title
    })
    if (succeeded) newThreadTitle.value = ''
}
</script>
