window.onload = () =>
{
    document.querySelectorAll('.math').forEach((element) =>
    {
        let org = element.innerHTML
        org = org.replace(/\&lt;/gi, '<')
                .replace(/\&gt;/gi, '>')
                .replace(/\&amp;/gi, '&')
        katex.render(org, element, {throwOnErrorL: false})
    })
}
