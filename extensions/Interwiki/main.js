let mapping = {
    '나무위키': 'https://namu.wiki/w/',
    'Wikipedia': 'https://en.wikipedia.org/wiki/',
    '위키백과': 'https://ko.wikipedia.org/wiki/',
    '리브레위키': 'https://librewiki.net/wiki/'
}

function linkfix(t)
{
    const rExec = /^<a.*?>(.*?)<\/a>$/ig.exec(t)
    if (rExec && rExec.length == 2) return rExec[1]
    else return t
}

let onCall = (pagename, data, req, res, redirect, incl, args, renderOptions) =>
{
    for (let i in mapping)
    {
        let r = new RegExp(`\\[\\[${i}:([^|\\r\\n]*?)\\]\\]`, 'igm')
        data = data.replace(r, (_match, p1, _offset, _string, _groups) =>
        {
            p1 = linkfix(p1)
            let p1Tooltip = i + p1.replace(/'/g,`&apos;`)
            return `<a href='${mapping[i] + p1}' rel='nofollow noopener noreferrer' title='${p1Tooltip}'>${i}:${p1}</a>`
        })

        let r2 = new RegExp(`\\[\\[${i}:(.*?)\\|(.*?)\\]\\]`, 'igm')
        data = data.replace(r2, (_match, p1, p2, _offset, _string, _groups) =>
        {
            p1 = linkfix(p1)
            let p1Tooltip = i + p1.replace(/'/g,`&apos;`)
            return `<a href='${mapping[i] + p1}' rel='nofollow noopener noreferrer' title='${p1Tooltip}'>${p2}</a>`
        })
    }
    return {pagename, data, req, res, redirect, incl, args, renderOptions}
}
module.exports = async (app, registerHook, registerDB) =>
{
    registerHook('beginRender', onCall)
}