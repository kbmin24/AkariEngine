$(() =>
{
    let hash = md5(document.getElementsByClassName('identicon')[0].getAttribute('data-id')).toString()
    let img = new Identicon(hash, {format:'svg'}).toString()
    document.getElementsByClassName('identicon')[0].setAttribute('src', 'data:image/svg+xml;base64,'+img)
})