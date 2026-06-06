function processFootnotes(el) {
    document.querySelectorAll('.modal[id^="fnModal_"]').forEach(m => m.remove())

    for (let i = 0; i < 6; i++) {
        el.querySelectorAll('.fn_origin_unprocessed').forEach(element => {
            const fnCount = parseInt(element.getAttribute('data-x'))
            const label = element.getAttribute('data-y')
            const text = element.innerHTML

            element.innerHTML = `<sup><a data-bs-toggle="modal" data-bs-target="#fnModal_${fnCount}" id="foot_source${fnCount}" href="" title="${label}">[${fnCount}]</a></sup>`
            element.classList.remove('fn_origin_unprocessed')

            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="fnModal_${fnCount}" tabindex="-1" aria-labelledby="fnModalLabel_${fnCount}" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="fnModalLabel_${fnCount}">[${fnCount}]</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">${text}</div>
                        </div>
                    </div>
                </div>
            `)
        })
    }
}

function processMath(el) {
    if (!window.katex) return

    const decode = (s) => s.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')

    el.querySelectorAll('.math').forEach(element => {
        katex.render(decode(element.innerHTML), element, { throwOnError: false })
    })
    el.querySelectorAll('.mathd').forEach(element => {
        katex.render(decode(element.innerHTML), element, { throwOnError: false, displayMode: true })
    })
}

function processMaps(el) {
    if (!window.L) return

    el.querySelectorAll('.map').forEach(element => {
        const x = parseFloat(element.getAttribute('data-x'))
        const y = parseFloat(element.getAttribute('data-y'))
        const z = parseInt(element.getAttribute('data-z'))
        const pins = JSON.parse(element.getAttribute('data-a') || '[]')

        if (isNaN(x) || isNaN(y) || isNaN(z)) return

        const map = L.map(element).setView([x, y], z)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map)

        for (const pin of pins) {
            const marker = L.marker([pin.x, pin.y]).addTo(map)
            if (pin.label) marker.bindPopup(pin.label)
        }
    })
}

export function usePostRender(elRef, dataRef) {
    const run = async () => {
        await nextTick()
        const el = elRef.value
        if (!el) return
        processFootnotes(el)
        processMath(el)
        processMaps(el)
    }

    onMounted(run)
    watch(() => dataRef.value?.content, run)
}
