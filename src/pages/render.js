//This function:
//gets markup and returns HTML.
//todo: redirect loop (?redirect=true?)
const { response } = require('express')
var sanitiseHtml = require('sanitize-html')
const dateandtime = require('date-and-time')
async function renderMacro(macro, args, pages = undefined, incl=true)
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
        case 'file':
            //todo: change to random file name
            var options = args.split('|')
            var res = ''
            var filename = ''
            const properties = [
                new RegExp('^(.*?\.(?:png|jpg|jpeg|gif|webp))$', 'gi'),
                new RegExp('^width\ ?=\ ?(.*?)$', 'ig'),
                new RegExp('^height\ ?=\ ?(.*?)$', 'ig')
            ]
            options.forEach((val, i, arr) =>
            {
                properties.forEach((reg, j, props) =>
                {
                    if (reg.test(val.trim()))
                    {
                        if (j == 0)
                        {
                            filename = val
                            res += 'src=\'/uploads/'//src
                        }
                        res += val
                        if (j == 0) res += '\''
                        res += ' ' 
                    }
                })
            })
            return `<a href='/file/${filename}'><img ${res} class='ren-img img-fluid'></a>`
        case 'include':
            //let's fetch the data
            args = args.split('|')
            const p = await pages.findOne({where: {title: args[0]}})
            if (!p)
            {
                return `[${macro}(${args})]`
            }
            else
            {
                var temArgs = {}
                for (var i = 1; i < args.length; i++)
                {
                    const eqSign = args[i].indexOf('=')
                    if (eqSign === undefined)
                    {
                        return `<p class="fw-bold text-danger">INCLUDE MACRO ERROR: no value given for argument ${args[i]}</p>`
                    }
                    const k = args[i].substring(0,eqSign).trim()
                    const v = args[i].substring(eqSign + 1).trim()
                    temArgs[k] = v
                }
                const res = await require(global.path + '/pages/render.js')(p.title, p.content, true, pages, undefined, undefined, redirect=false, incl=false, args=temArgs)
                return res
            }
        case 'color':
            const lastComma = args.lastIndexOf('|')
            const color = args.substring(lastComma + 1, args.length)
            const text = args.substring(0, lastComma)
            return '<span style="color: ' + color + '" class="renColor">' + text + '</span>'
        case 'youtube':
            const ifr = `<iframe class='ren-yt' width="560" height="315" src="https://www.youtube-nocookie.com/embed/${args}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            //console.log(ifr)
            return ifr
        default:
            return `[${macro}(${args})]`
            //return '<p class="fw-bold text-danger">UNDEFINED MACRO ERROR: Macro with name "' + macro + '" does not exist.'
    }
}
async function asyncMacro(str, regex, fn, pages, incl=true)
{
    //https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
    const promises = []
    str.replace(regex, (match, p1, p2, offset, string, groups) =>
    {
        const promise = fn(p1, p2, pages, incl=incl)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
}
function list(line, type)
{
    //type: ul, ol
    line = line.trim()
    var lines = line.split(/\r?\n/)
    var res = '<' + type + '>'
    lines.forEach((item, index, a) =>
    {
        res += '<li>'
        item = item.substr(2,item.length)
        res += item
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
    var res = `<h${depth+1} class='border-bottom ren-header' id='s${buildHeadingName(depth, '_')}'><a href='#toc'>${buildHeadingName(depth, '.')}.</a> ${text}</h${depth+1}>` //<a href='#s${buildHeadingName(depth, '_')}'>¶</a>

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
function fredirect(orgname, pagename, paragraph, text, res, redirect)
{
    pagename = sanitiseHtml(pagename,{allowedTags: [], allowedAttributes: {}})
    if (res !== undefined)
    {
        if (!redirect)
        {
            return `<p>${text}</p>`
        }
        res.redirect(`/w/${pagename}?from=${orgname}${paragraph === undefined ? '' : paragraph}`) //todo: implement s-? redirected from?
        return undefined
    }
    else return '<p><span class="fw-bold text-danger">REDIRECT ERROR</span>: redirect can only be done on a normal page.</p>'
}

var currentTOC = undefined
var latestHeading = 7
var toc
var footnotes = []
var footnote
var footnotecount

const ulRegex = /^(?:\* (.+(?:\r?\n|$)))+/igm
const olRegex = /^(?:1\.+ (.+(?:\r?\n|$)))+/igm

module.exports = async (pagename, data, renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={}) => //todo: remove pages requirement
{
    //initialise
    currentTOC = [undefined, 0, 0, 0, 0, 0] //supports until 5th
    latestHeading = 7
    toc = 'Table of Contents<hr>'

    const redrFrom = req === undefined ? undefined : req.query.from
    if (redrFrom !== undefined)
    {
        redirect = false;
        data = `<i>Redirected from <a href="/w/${redrFrom}?redirect=false">${redrFrom}</a></i><br>` + data
    }
    //Redirect
    const redr = data.replace(/^#redirect (.*?)(?:\r?\n)*(#(?:s\d+))?$/igm, (match, p1, p2, offset, string, groups) =>
    {
        if (undefined === fredirect(pagename, p1, p2, string, res, redirect))
        {
            return undefined;
        }
    })
    if (redr === undefined)
    {
        return undefined
    } //escape
    
    //args
    data = data.replace(/{{{(.+?)}}}/igm, (match, p1, offset, string, groups) =>
    {
        const res = args[p1.trim()]
        if (res === undefined)
        {
            return `{{{${p1}}}}` //no change
        }
        else
        {
            return res
        }
    })

    //centred text
    data = data.replace(/\[\:\]{{(.*)}}/igm, '<div class="ren-center">$1</div>')
    //left aligned text
    data = data.replace(/\[\(\]{{(.*)}}/igm, '<div class="ren-left">$1</div>')
    //right aligned text
    data = data.replace(/\[\)\]{{(.*)}}/igm, '<div class="ren-right">$1</div>')

    //headings
    data = data.replace(/^(=+)\ (.*)\ =+\r?\n/igm, (match, p1, p2, offset, string, groups) => renderHeading(p2, p1.length))

    //macro
    //asyncMacro(str, regex, fn, pages)
    data = await asyncMacro(data, /\[(.*?)\((.*?)\)\]/igm, renderMacro, pages, incl=incl)
    //data = data.replace(/\[(.*?)\((.*?)\)\]/igm, (match, p1, p2, offset, string, groups) => {renderMacro(p1, p2, pages)})]

    //ul
    data = data.replace(ulRegex, (match, p1, offset, string, groups) => list(match,'ul')) //NOTE: must have /n at the end
    //ol
    data = data.replace(olRegex, (match, p1, offset, string, groups) => (list(match,'ol')))
    //big text
    data = data.replace(/"""(.*?)"""/gim, '<span style="font-size: 24px">$1</span>')
    //bold
    data = data.replace(/'''(.*?)'''/gim, '<b>$1</b>')
    //italic
    data = data.replace(/''(.*?)''/igm, '<i>$1</i>')
    //underline
    data = data.replace(/__(.*?)__/igm, '<u>$1</u>')
    //strike
    data = data.replace(/--(.*?)--/igm, '<del class="text-secondary">$1</del>')
    //superscript
    data = data.replace(/\^\^(.*?)\^\^/igm, '<sup>$1</sup>')
    //subscript
    data = data.replace(/,,(.*?),,/igm, '<sub>$1</sub>')
    
    //external link
    data = data.replace(/\[\[(https?\:([^|\r\n]*?))\]\]/igm, (match, p1, offset, string, groups) =>
    {
        return `<i class="fa fa-external-link-square ren-extlink-icon" aria-hidden="true"></i><a href='${p1}' target='_blank' rel='noopener noreferrer' class='ren-extlink'>${p1}</a>`
    })
    //external link with different text
    data = data.replace(/\[\[(https?\:.*?)\|(.*?)\]\]/igm, (match, p1, p2, offset, string, groups) =>
    {
        return `<i class="fa fa-external-link-square ren-extlink-icon" aria-hidden="true"></i><a href='${p1}' target='_blank' rel='noopener noreferrer' class='ren-extlink'>${p2}</a>`
    })
    //Internal Link
    data = data.replace(/\[\[([^|\r\n]*?)\]\]/igm, '<a href="/w/$1">$1</a>')
    //Internal Link with different text
    data = data.replace(/\[\[(.*?)\|(.*?)\]\]/igm, '<a href="/w/$1">$2</a>')

    //footnote
    footnotes = []
    footnote = '<hr><b>Footnotes</b><br>'
    footnotecount = 0
    data = data.replace(/\[\*\ (.*?)\]/igm, (match, p1, offset, string, groups) => regFootnote(p1))

    //build footnote
    data += footnotes.length == 0 ? '' : generateFootnote()

    /*
    //replace \n
    data = data.replace(/\r?\n/igm, '<br>')
    */
   
    //make into paragraphs
    /*data = data.replace(/^( *)(.*?)(?:\r?\n)(?:\r?\n)?/igm, (match, p1, p2, offset, string, groups) =>
    {
        if (/^<(ul|ol)>(.*?)<\/ul|ol>/ig.test(p2) || p2 == '<hr>' || /^<h\d>(.*?)<\/h\d>$/) return p2
        var ind = ''
        return `<p>${'&nbsp;'.repeat(p1 ? p1.length : 0)}${p2}</p>`
    })*/
    data = data.replace(/(?:^|\>)(:+)(.*)(\r?\n|$)/igm, (match, p1, p2, offset, string, groups) =>
    {
        return (match[0] == '>' ? '>' : '') + `<div style='padding-left: ${5 * p1.length}px'>${p2}</div>`
    })
    data = data.replace(/\r?\n/igm, '<br>')

    //escape things
    data = data.replace(/((\\\\|\\))/igm, (match, p1, offset, string, groups) => {return p1 == '\\' ? '' : '\\\\'})
    //sanitising things
    data = sanitiseHtml(data, global.sanitiseOptions)

    return data
}