window.onload = () =>
{
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
    })
}
