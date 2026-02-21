if (localStorage.getItem('theme') == 'light' || localStorage.getItem('theme') != 'dark' && (window.matchMedia && !window.matchMedia('(prefers-color-scheme: dark)').matches))
{
    //do nothing
}
else
{
    let head = document.getElementsByTagName('head')[0]
    let link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = '/skins/' + document.head.querySelector("[name~=wikiskin][content]").content + '/css/dark.css'
    head.appendChild(link)
}