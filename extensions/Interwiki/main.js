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

let onCall = (input, renderOptions, repositories, canRedirect) =>
{
    for (let i in mapping)
    {
        let r = new RegExp(`\\[\\[${i}:([^|\\r\\n]*?)\\]\\]`, 'igm')
        input = input.replace(r, (_match, p1, _offset, _string, _groups) =>
        {
            p1 = linkfix(p1)
            let p1Tooltip = i + p1.replace(/'/g,`&apos;`)
            return `<a href='${mapping[i] + p1}' rel='nofollow noopener noreferrer' data-is-external='true' title='${p1Tooltip}'>${i}:${p1}</a>`
        })

        let r2 = new RegExp(`\\[\\[${i}:(.*?)\\|(.*?)\\]\\]`, 'igm')
        input = input.replace(r2, (_match, p1, p2, _offset, _string, _groups) =>
        {
            p1 = linkfix(p1)
            let p1Tooltip = i + p1.replace(/'/g,`&apos;`)
            return `<a href='${mapping[i] + p1}' rel='nofollow noopener noreferrer' data-is-external='true' title='${p1Tooltip}'>${p2}</a>`
        })
    }
    return {input, renderOptions, repositories, canRedirect}
}

export default async (app, registerHook, _registerDB) =>
{
    registerHook('beginRender', onCall)
}