function closefnModal(fnCount)
{
    $(`#fnModal_${fnCount}`).modal('hide')
    //https://stackoverflow.com/questions/13735912/anchor-jumping-by-using-javascript
    var url = location.href
    location.href = `#foot_${fnCount}`
    history.replaceState(null,null,url)
}
window.onload = () =>
{
    document.querySelectorAll('.fn_origin').forEach(element =>
    {
        let fnCount = parseInt(element.getAttribute('data-x'))
        let label = element.getAttribute('data-y')
        let text = element.innerHTML
        let footnotes = document.getElementById('footnotes')
        element.innerHTML = `<sup><a data-bs-toggle='modal' data-bs-target='#fnModal_${fnCount}' id='foot_source${fnCount}' href='' title='${label}'>[${fnCount}]</a></sup>`
        footnotes.innerHTML += `
        <div class="modal fade" id="fnModal_${fnCount}" tabindex="-1" aria-labelledby="fnModalLabel_${fnCount}" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="fnModalLabel_${fnCount}">
                            주석: [${fnCount}]
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${text}
                    </div>
                </div>
            </div>
        </div>
    `
    //<a href='#foot_${fnCount}'>[${fnCount}]</a>
    })
    document.querySelectorAll('.math').forEach(element =>
    {
        let org = element.innerHTML
        org = org.replace(/\&lt;/gi, '<')
                .replace(/\&gt;/gi, '>')
                .replace(/\&amp;/gi, '&')
        katex.render(org, element, {throwOnErrorL: false})
    })
    document.querySelectorAll('.map').forEach(element =>
    {
        let x = parseFloat(element.getAttribute('data-x'))
        let y = parseFloat(element.getAttribute('data-y'))
        let z = parseInt(element.getAttribute('data-z'))

        if (!x && !y && !z) return

        let options =
        {
            center: new kakao.maps.LatLng(x, y),
            level: z
        }
    let map = new kakao.maps.Map(element, options)

        let mapTypeControl = new kakao.maps.MapTypeControl()
        map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT)

        let zoomControl = new kakao.maps.ZoomControl()
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT)

        let marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(x, y)
        })
        marker.setMap(map)
    })
}
