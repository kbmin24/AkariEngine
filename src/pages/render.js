//This function:
//gets markup and returns HTML.
//todo: redirect loop (?redirect=true?)
function renderMacro(macro, args, pages = undefined)
{
    var argsSplit = args.split(',')
    //switch?
    if (macro == 'br')
    {
        return '<br>'
    }
    else if (macro == 'color')
    {
        return '<span style="color: ' + argsSplit[1] + '">' + argsSplit[0] + "</span>"
    }
    else if (macro == 'include')
    {
        //todo: what if pagename has ','?
        //=> allow to
        const page = pages.findOne({where: {title: args}})
        if (page)
        {
            console.log(typeof page.content)
            return page.content
        }
        else
        {
            return '<p class="fw-bold text-danger">INCLUDE MACRO ERROR: Page with name "' + args + '" does not exist.'
        }
    }
    else
    {
        return '<p class="fw-bold text-danger">UNDEFINED MACRO ERROR: Macro with name "' + macro + '" does not exist.'
    }
}
function list(line, type)
{
    //type: ul, ol
    line = line.trim()
    var lines = line.split('\n')
    var res = '<' + type + '>'
    lines.forEach((item, index, a) =>
    {
        res += '<li>'
        res += item.substr(2,item.length)
        res += '</li>'
    })
    res += '</' + type + '>'
    return res
}
module.exports = (data, renderInclude, pages) =>
{
    //macro
    data = data.replace(/\[(.*)\((.*)\)\]/igm, (match, p1, p2, offset, string, groups) => renderMacro(p1, p2, pages))
    //ul
    data = data.replace(/((?:\* .+\r?\n)+)/igm, (match, p1, p2, offset, string, groups) => (list(p1,'ul'))) //NOTE: must have /n at the end
    //ol
    data = data.replace(/((?:1\. .+\r?\n)+)/igm, (match, p1, p2, offset, string, groups) => (list(p1,'ol')))
    //big text
    data = data.replace(/"""(.*)"""/gim, '<span style="font-size: 24px">$1</span>')
    //bold
    data = data.replace(/'''(.*)'''/gim, '<b>$1</b>')
    //italic
    data = data.replace(/''(.*)''/igm, '<i>$1</i>')
    //underline
    data = data.replace(/__(.*)__/igm, '<u>$1</u>')
    //strike
    data = data.replace(/--(.*)--/igm, '<del class="text-secondary">$1</del>')
    //superscript
    data = data.replace(/\^\^(.*)\^\^/igm, '<sup>$1</sup>')
    //subscript
    data = data.replace(/,,(.*),,/igm, '<sub>$1</sub>')
    
    //external link with different text
    data = data.replace(/\[\[(https?\:.*)\|(.*)\]\]/igm, '<a href="$1">$2</a>')
    //external link
    data = data.replace(/\[\[(https?\:.*)\]\]/igm, '<a href="$1">$1</a>')
    //Internal Link with different text
    data = data.replace(/\[\[(.*)\]\]/igm, '<a href="/w/$1">$1</a>')
    //Internal Link
    data = data.replace(/\[\[(.*)\]\]/igm, '<a href="/w/$1">$1</a>')

    //replace \n
    data = data.replace(/\n/gim, '<br>')
    //xss?
    //finally, escaping token
    return data
}