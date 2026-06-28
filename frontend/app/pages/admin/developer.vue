<template>
    <div v-if="isError" class="p-3">
        <LocalizedMessage :keypath="errorMessageKey" :params="errorMessageParams"
            :message="errorMessageFallback" tag="p" />
    </div>
    <div v-else>
        <div v-if="socketError" class="alert alert-danger" role="alert">
            {{ socketError }}
        </div>

        <pre ref="consoleWindow" class="developer-console" aria-live="polite">{{ output }}</pre>

        <form class="row g-2 align-items-center" @submit.prevent="sendCommand">
            <label for="inputCommand" class="col-sm-2 col-form-label">Command</label>
            <div class="col-sm-8">
                <input id="inputCommand" v-model="commandInput" type="text" class="form-control"
                    :disabled="!socketReady" autocomplete="off">
            </div>
            <div class="col-sm-2">
                <button type="submit" class="btn btn-primary w-100"
                    :disabled="!socketReady || !commandInput.trim()">
                    {{ $t('adminTools.devTools.send') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
const { t } = useI18n()
const config = useRuntimeConfig()
const { setPageHeader } = usePageHeader()

const output = ref('')
const commandInput = ref('')
const consoleWindow = ref(null)
const socketReady = ref(false)
const socketError = ref(null)

const { data, error, pending } = await useFetch('/api/admin/developer')

const isError = computed(() => !pending.value && (!!error.value || !!data.value?.error))
const errorDetails = computed(() => error.value?.data ?? data.value ?? {})
const errorMessageKey = computed(() => errorDetails.value?.i18nKey || null)
const errorMessageParams = computed(() => errorDetails.value?.i18nParams ?? {})
const errorMessageFallback = computed(() => errorDetails.value?.i18nKey
    ? ''
    : (errorDetails.value?.message ?? t('dataLoadError')))

useHeadSafe(computed(() => ({
    title: `${t('devmenu')} - ${config.public.appname}`,
})))

const applyHeader = () => setPageHeader({
    title: isError.value ? t('error') : t('devmenu'),
})

applyHeader()
watch([data, error], applyHeader)

let socket = null
let componentActive = false

const scrollConsoleToBottom = async () => {
    await nextTick()
    if (!consoleWindow.value) return
    consoleWindow.value.scrollTop = consoleWindow.value.scrollHeight
}

const appendOutput = text => {
    output.value += String(text ?? '')
    scrollConsoleToBottom()
}

const handleOutput = data => appendOutput(data)

const handleJoinOk = () => {
    socketReady.value = true
    socketError.value = null
}

const handleDisconnect = () => {
    socketReady.value = false
    socketError.value = t('adminTools.devTools.connectionError')
}

const handleConnectError = connectError => {
    socketReady.value = false
    socketError.value = connectError?.message ?? t('adminTools.devTools.connectionError')
}

const joinDeveloperConsole = () => {
    if (!socket || !componentActive || isError.value) return

    appendOutput(output.value ? '\nConnecting...\n' : 'Connecting...')
    socket.emit('joinRoom', { roomId: 'developerconsole', notAThread: true }, result => {
        if (!componentActive) return
        if (!result?.success) {
            socketReady.value = false
            socketError.value = result?.message ?? t('adminTools.devTools.connectionError')
        }
    })
}

onMounted(() => {
    componentActive = true
    if (isError.value) return

    socket = useSocket()
    if (!socket) {
        socketError.value = t('adminTools.devTools.connectionError')
        return
    }

    socket.on('connect', joinDeveloperConsole)
    socket.on('connect_error', handleConnectError)
    socket.on('disconnect', handleDisconnect)
    socket.on('joinok', handleJoinOk)
    socket.on('output', handleOutput)

    if (socket.connected) joinDeveloperConsole()
})

onBeforeUnmount(() => {
    componentActive = false
    if (!socket) return

    socket.off('connect', joinDeveloperConsole)
    socket.off('connect_error', handleConnectError)
    socket.off('disconnect', handleDisconnect)
    socket.off('joinok', handleJoinOk)
    socket.off('output', handleOutput)
    socket.emit('leaveRoom', { roomId: 'developerconsole' })
})

const sendCommand = () => {
    const command = commandInput.value.trim()
    if (!command || !socketReady.value || !socket) return

    socket.emit('input', { command })
    commandInput.value = ''
}
</script>

<style scoped>
.developer-console {
    width: 100%;
    height: 400px;
    padding: 0.75rem;
    margin-bottom: 0.625rem;
    overflow-y: auto;
    color: #fff;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background-color: #000;
    border: 0;
    font-family: D2Coding, "Courier New", monospace;
}
</style>
