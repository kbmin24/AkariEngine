/* exported closefnModal */
/* global L:readonly */
function closefnModal(fnCount) {
    $(`#fnModal_${fnCount}`).modal('hide')
    //https://stackoverflow.com/questions/13735912/anchor-jumping-by-using-javascript
    var url = location.href
    location.href = `#foot_${fnCount}`
    history.replaceState(null, null, url)
}
window.onload = () => {
    // support up to footnote^6
    for (let i = 0; i < 6; i++) {
        document.querySelectorAll('.fn_origin_unprocessed').forEach(element => {
            let fnCount = parseInt(element.getAttribute('data-x'))
            let label = element.getAttribute('data-y')
            let text = element.innerHTML
            element.innerHTML = `<sup><a data-bs-toggle='modal' data-bs-target='#fnModal_${fnCount}' id='foot_source${fnCount}' href='' title='${label}'>[${fnCount}]</a></sup>`
            element.classList.remove('fn_origin_unprocessed')

            document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="fnModal_${fnCount}" tabindex="-1" aria-labelledby="fnModalLabel_${fnCount}" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="fnModalLabel_${fnCount}">
                                [${fnCount}]
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${text}
                        </div>
                    </div>
                </div>
            </div>
        `)
            //<a href='#foot_${fnCount}'>[${fnCount}]</a>
        })
    }
    document.querySelectorAll('.math').forEach(element => {
        let org = element.innerHTML
        org = org.replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
        katex.render(org, element, { throwOnErrorL: false })
    })
    document.querySelectorAll('.mathd').forEach(element => {
        let org = element.innerHTML
        org = org.replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
        katex.render(org, element, { throwOnErrorL: false, displayMode: true })
    })
    document.querySelectorAll('.map').forEach(element => {
        let x = parseFloat(element.getAttribute('data-x'))
        let y = parseFloat(element.getAttribute('data-y'))
        let z = parseInt(element.getAttribute('data-z'))

        let pins = JSON.parse(element.getAttribute('data-a') || '[]')

        if (isNaN(x) || isNaN(y) || isNaN(z)) return

        const map = L.map(element).setView([x, y], z)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map)

        for (let pin of pins) {
            let marker = L.marker([pin.x, pin.y]).addTo(map)
            if (pin.label) {
                marker.bindPopup(pin.label)
            }
        }
    })
}
