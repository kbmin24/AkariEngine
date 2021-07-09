//This function:
//gets markup and returns HTML.
//todo: redirect loop (?redirect=true?)
var sanitiseHtml = require('sanitize-html')
function renderMacro(macro, args, pages = undefined)
{
    //switch?
    switch (macro)
    {
        case 'hr':
            return '<hr>'
        case 'br':
            return '<br>'
        case 'toc':
            return buildTOC()
        case 'color':
            const lastComma = args.lastIndexOf(',')
            const color = args.substring(lastComma + 1, args.length)
            const text = args.substring(0, lastComma)
            return '<span style="color: ' + color + '">' + text + '</span>'
        case 'youtube':
            return '<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/' + args + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
        case 'footnote':
            return generateFootnote()
        default:
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
function buildHeadingName(depth, separator)
{
    var res = ''
    for (var i = 1; i <= depth; i++)
    {
        res += currentTOC[i].toString()
        if (i != depth) res += separator
    }
    return res
}
function renderHeading(text, depth)
{
    for (var i = depth + 1; i <= 5; i++) currentTOC[i] = 0
    if (latestHeading >= depth) currentTOC[depth]++
    latestHeading = depth
    if (currentTOC[depth] == 0) currentTOC[depth] = 1
    var res = `<h${depth+1} class='border-bottom' id='s${buildHeadingName(depth, '_')}'><a href='#toc'>${buildHeadingName(depth, '.')}.</a> ${text}</h2>`

    //update TOC
    for (var i = 1; i < depth; i++) toc += '&ensp;'
    toc += `<a href='#s${buildHeadingName(depth, '_')}'>${buildHeadingName(depth, '.')}</a>.&nbsp;${text}<br>`
    return res
}
function buildTOC()
{
    return `<div id='toc' class='border m-3 ms-0 p-3 ren-toc'>${toc}</div>`
}
function regFootnote(text)
{
    const f = [++footnotecount, text]
    footnotes.push(f)
    return `<sup><a href='#foot_${footnotecount}' id='foot_source${footnotecount}'>[${footnotecount}]</a></sup>`
}
function generateFootnote()
{
    while (footnotes.length)
    {
        const ft = footnotes[0]
        footnotes.shift()
        footnote += `<a id='foot_${ft[0]}' href='#foot_source${ft[0]}'>[${ft[0]}]</a> ${ft[1]}<br>`
    }
    return footnote
}
var currentTOC = undefined
var latestHeading = 7
var toc
var footnotes = []
var footnote
var footnotecount


module.exports = (data, renderInclude, pages = undefined) => //todo: remove pages requirement
{
    //initialise
    currentTOC = [undefined, 0, 0, 0, 0, 0] //supports until 5th
    latestHeading = 7
    toc = 'Table of Contents<hr>'

    //centred text
    data = data.replace(/<:>{{(.*)}}/igm, '<div class="ren-center">$1</div>')
    //left aligned text
    data = data.replace(/<<>{{(.*)}}/igm, '<div class="ren-left">$1</div>')
    //right aligned text
    data = data.replace(/<>>{{(.*)}}/igm, '<div class="ren-right">$1</div>')

    //sanitising things
    data = sanitiseHtml(data, global.sanitiseOptions)

    //headings
    data = data.replace(/^(=+)\ (.*)\ =+\r?\n/igm, (match, p1, p2, offset, string, groups) => renderHeading(p2, p1.length))

    //macro
    data = data.replace(/\[(.*?)\((.*?)\)\]/igm, (match, p1, p2, offset, string, groups) => renderMacro(p1, p2, pages))

    //footnote
    footnotes = []
    footnote = 'Footnotes<hr>'
    footnotecount = 0
    data = data.replace(/\[\*\ (.*?)\]/igm, (match, p1, offset, string, groups) => regFootnote(p1))

    //ul
    data = data.replace(/^((?:\* .+\r?\n)+)/igm, (match, p1, p2, offset, string, groups) => (list(p1,'ul'))) //NOTE: must have /n at the end
    //ol
    data = data.replace(/^((?:1\. .+\r?\n)+)/igm, (match, p1, p2, offset, string, groups) => (list(p1,'ol')))
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
    data = data.replace(/\[\[(.*)\|(.*)\]\]/igm, '<a href="/w/$1">$2</a>')
    //Internal Link
    data = data.replace(/\[\[(.*)\]\]/igm, '<a href="/w/$1">$1</a>')

    //replace \n
    data = data.replace(/\r?\n/igm, '<br>')

    return data
}