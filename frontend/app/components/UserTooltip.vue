<template>
    <span class="user-tooltip d-inline-block">
        <a ref="triggerElement" :href="primaryHref" role="button" :aria-expanded="isShown"
            @click.prevent="togglePopover">{{ user }}</a>

        <Teleport to="body">
            <div v-if="isShown" ref="popoverElement" class="popover bs-popover-bottom show user-tooltip-popover shadow"
                role="tooltip" :style="popoverStyle">
                <div class="popover-body">
                    <div>
                        <span class="userTitle">{{ user }}</span>
                        <span v-if="isIP" class="badge text-bg-secondary ms-1">{{ $t('ipUser') }}</span>
                        <span v-else class="badge text-bg-success ms-1">{{ $t('loginUser') }}</span>
                    </div>
                    <hr class="popover-sep">
                    <template v-if="!isIP">
                        <NuxtLink class="d-block" :to="`/w/User:${encodedUser}`" @click="hidePopover">
                            {{ $t('userPage') }}
                        </NuxtLink>
                        <NuxtLink class="d-block" :to="`/threads/User:${encodedUser}`" @click="hidePopover">
                            {{ $t('userDiscussion') }}
                        </NuxtLink>
                        <hr class="popover-sep">
                    </template>
                    <NuxtLink class="d-block" :to="`/contribution/${encodedUser}`" @click="hidePopover">
                        {{ $t('contribList') }}
                    </NuxtLink>
                </div>
            </div>
        </Teleport>
    </span>
</template>

<script setup>
import isIPAddress from '../../util/isIPAddress.js'

const props = defineProps({
    user: { type: String, required: true },
})

const triggerElement = ref(null)
const popoverElement = ref(null)
const isShown = ref(false)
const popoverStyle = ref({})

const isIP = computed(() => isIPAddress(props.user))
const encodedUser = computed(() => encodeURIComponent(props.user))
const primaryHref = computed(() => isIP.value ? `/contribution/${encodedUser.value}` : `/w/User:${encodedUser.value}`)

const hidePopover = () => {
    isShown.value = false
}

const updatePopoverPosition = async () => {
    await nextTick()

    const trigger = triggerElement.value
    const popover = popoverElement.value
    if (!trigger || !popover) return

    const rect = trigger.getBoundingClientRect()

    popoverStyle.value = {
        left: `${rect.left + rect.width / 2}px`,
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        transform: 'translateX(-50%)',
        zIndex: 'var(--bs-popover-zindex)',
    }
}

const togglePopover = async () => {
    isShown.value = !isShown.value
    if (isShown.value) {
        await updatePopoverPosition()
    }
}

const handleDocumentClick = (event) => {
    if (!isShown.value) return

    if (
        triggerElement.value?.contains(event.target) ||
        popoverElement.value?.contains(event.target)
    ) {
        return
    }

    hidePopover()
}

onMounted(() => {
    document.addEventListener('click', handleDocumentClick, true)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick, true)
    window.removeEventListener('resize', updatePopoverPosition)
    window.removeEventListener('scroll', updatePopoverPosition, true)
})
</script>

<style scoped>
.user-tooltip-popover {
    min-width: max-content;
}

.user-tooltip-popover>.popover-arrow {
    left: 50%;
    top: calc(-1 * var(--bs-popover-arrow-height));
    transform: translateX(-50%);
}

.userTitle {
    font-weight: 700;
    font-size: 1.2em;
}

.popover-sep {
    margin: 0.5rem calc(-1*var(--bs-popover-body-padding-x));
}
</style>
