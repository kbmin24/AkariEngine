/* eslint-disable no-unused-vars */
//This function:
//gets markup and returns HTML.

const dateandtime = require('date-and-time')
var sanitiseHtml = require('sanitize-html')
async function renderMacro(macro, args, pages = undefined, incl = true)
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
        {
            //todo: change to random file name
            var options = args.split('|')
            var res = ''
            var filename = ''
            const properties = [
                /^(.*?\.(?:png|jpg|jpeg|gif|webp))$/gi,
                /^width ?= ?(.*?)$/ig,
                /^height ?= ?(.*?)$/ig
            ]
            options.forEach((val) =>
            {
                properties.forEach((reg, j) =>
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
        }
        case 'include':
        {
            if (!incl)
            {
                return ''//`[${macro}(${args})]`
            }
            //let's fetch the data
            args = args.split('|')
            const p = await pages.findOne({where: {title: args[0]}})
            if (!p)
            {
                return ''
                //return `[${macro}(${args})]`
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
                const res = await require(global.path + '/pages/render.js')(p.title, p.content, true, pages, undefined, undefined, false, false, temArgs)
                return res
            }
        }
        case 'color':
        {
            const lastComma = args.lastIndexOf('|')
            const color = args.substring(lastComma + 1, args.length)
            const text = args.substring(0, lastComma)
            return '<span style="color: ' + color + '" class="renColor">' + text + '</span>'
        }
        case 'youtube':
        {
            const ifr = `<iframe class='ren-yt' width="560" height="315" src="https://www.youtube-nocookie.com/embed/${args}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            //console.log(ifr)
            return ifr
        }
        case 'anchor':
        {
            return `<a id='${args}'></a>`
        }
        case 'dday':
        {
            try
            {
                if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) throw new Error()
                const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
                let gap = (new Date()) - d1
                let res = Math.floor(gap / (1000 * 60 * 60 * 24))
                res = res < 0 ? res + '' : '+' + res
                return res
            }
            catch (e)
            {
                return '<p class="fw-bold text-danger">DDAY ERROR: Invalid Date Format</p>'
            }
        }
        case 'agek':
        {
            try
            {
                if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) throw new Error()
                const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
                return (new Date()).getFullYear() - d1.getFullYear() + 1
            }
            catch (e)
            {
                return '<p class="fw-bold text-danger">DDAY ERROR: Invalid Date Format</p>'
            }
        }
        case 'age':
            {
                try
                {
                    if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) throw new Error()
                    const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
                    let age = (new Date()).getFullYear() - d1.getFullYear()
                    const m = (new Date()).getMonth() - d1.getMonth()
                    if (m < 0 || (m === 0 && (new Date()).getDate() < d1.getDate())) age--;
                    return age
                }
                catch (e)
                {
                    return '<p class="fw-bold text-danger">DDAY ERROR: Invalid Date Format</p>'
                }
            }
        default:
            return `[${macro}(${args})]`
            //return '<p class="fw-bold text-danger">UNDEFINED MACRO ERROR: Macro with name "' + macro + '" does not exist.'
    }
}
async function asyncMacro(str, regex, fn, pages, incl=true)
{
    //https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
    const promises = []
    str.replace(regex, (_match, p1, p2, _offset, _string, _groups) =>
    {
        const promise = fn(p1, p2, pages, incl)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
}
function list(line, type)
{
    //type: ul, ol
    line = line.trim()
    var res = ''
    const r = /^<\/h\d>(.*)$/s
    if (r.test(line))
    {
        res += '</h2>'
        line = line.replace(r, '$1')
    }
    var lines = line.split(/\r?\n/)
    res += '<' + type + '>'
    lines.forEach((item, _index, _a) =>
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
    for (let i = depth + 1; i <= 5; i++) currentTOC[i] = 0
    if (latestHeading >= depth) currentTOC[depth]++
    latestHeading = depth
    if (currentTOC[depth] == 0) currentTOC[depth] = 1
    var res = `<h${depth+1} class='border-bottom ren-header' id='s${buildHeadingName(depth, '_')}'><a href='#toc'>${buildHeadingName(depth, '.')}.</a> ${text}</h${depth+1}>` //<a href='#s${buildHeadingName(depth, '_')}'>¶</a>

    //update TOC
    for (let i = 1; i < depth; i++) toc += '&emsp;'
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

function renderTable(data)
{
    let res = '<table class=\'table table-bordered ren-table\' '
    
    //get table-wide options
    //Get the first cell
    let cellRegEx = /\|\| ?((?: ?\[.*?\] ?)*)(.*?)(?=\|\|)/igm
    let firstCellOptRegex = /\[ *(.*?) *\]/igm
    let firstCell = cellRegEx.exec(data)
    let firstCellOptFound
    let tableStyle = ''
    let caption = ''
    let borderColor
    let borderWidth
    while (((firstCellOptFound = firstCellOptRegex.exec(firstCell)) !== null))
    {
        if (/tablefloat *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            switch (firstCellOptFound[1].split('=')[1].trim())
            {
                case 'left':
                    tableStyle += 'float:left;'
                    break
                case 'center':
                case 'centre':
                    tableStyle += 'margin:auto;'
                    break
                case 'right':
                    tableStyle += 'float:right;'
                    break
            }
        }
        else if (/caption *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            caption = `<caption style='text-align:center'>${firstCellOptFound[1].split('=')[1].trim()}</caption>`
        }
        else if (/tablebordercolou?r *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            tableStyle += `border-color:${firstCellOptFound[1].split('=')[1].trim()};`
            borderColor = firstCellOptFound[1].split('=')[1].trim()
        }
        else if (/tableborderwidth *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            tableStyle += `border-width:${firstCellOptFound[1].split('=')[1].trim()};`
            borderWidth = firstCellOptFound[1].split('=')[1].trim()
        }
        else if (/tablebackgroundcolou?r *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            tableStyle += `background-color:${firstCellOptFound[1].split('=')[1].trim()};`
        }
        else if (/tablewidth *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            tableStyle += `width:${firstCellOptFound[1].split('=')[1].trim()};`
        }
        else if (/tableheight *?= *?(.+?)/i.test(firstCellOptFound[1]))
        {
            tableStyle += `height:${firstCellOptFound[1].split('=')[1].trim()};`
        }
    }
    res += `style='${tableStyle}'>`

    let colbody = '<colgroup'
    let tbody = '<tbody>'
    let rowNum = 1
    let tSplit = data.split('\n')
    tSplit.forEach((line) =>
    {
        //line.replace('\r', '') // /r/n problem
        if (line.trim() == '') return
        let l = '<tr '
        let rowStyle = ''
        let found
        let isFirst = true
        let cellRegEx = /\|\| ?((?: ?\[.*?\] ?)*)(.*?)(?=\|\|)/igm
        while (((found = cellRegEx.exec(line)) !== null))
        {
            if (isFirst)
            {
                //put row-wide attribute
                let colOptRegex = /\[ *(.*?) *\]/igm
                let optFound
                
                //search for attritubtes
                while (((optFound = colOptRegex.exec(found[1].trim())) !== null))
                {
                    if (optFound.length < 2) continue;
                    if (/rowbackgroundcolor=(.+?)/i.test(optFound[1]))
                    {
                        rowStyle += `background-color:${optFound[1].split('=')[1]};`
                    }
                }
                isFirst = false
                l += `style='${rowStyle}'>`
            }
            let cell = '<td '
            let cellStyle = ''
            let cellOptRegex = /\[ *(.*?) *\]/igm
            let cellOptFound
            if (borderColor) cellStyle += 'border-color:' + borderColor + ';'
            if (borderWidth) cellStyle += 'border-width:' +  borderWidth + ';'
            while (((cellOptFound = cellOptRegex.exec(found[1].trim())) !== null))
            {
                if (cellOptFound.length < 2) continue
                cellOptFound[1] = cellOptFound[1].trim()
                if (/-(.*?)/.test(cellOptFound[1])) //[-3]
                {
                    cell += `colspan='${cellOptFound[1].substring(1)}' `
                }
                else if (/\|(.*?)/.test(cellOptFound[1])) //[-3]
                {
                    cell += `rowspan='${cellOptFound[1].substring(1)}' `
                }
                else if (cellOptFound[1] == ':')
                {
                    cellStyle += 'text-align: center;'
                }
                else if (cellOptFound[1] == '(')
                {
                    cellStyle += 'text-align: left;'
                }
                else if (cellOptFound[1] == ')')
                {
                    cellStyle += 'text-align: right;'
                }
                else if (cellOptFound[1] == '^')
                {
                    cellStyle += 'vertical-align: top;'
                }
                else if (cellOptFound[1] == '=')
                {
                    cellStyle += 'vertical-align: middle;'
                }
                else if (cellOptFound[1] == 'v')
                {
                    cellStyle += 'vertical-align: bottom;'
                }
                else if (/bordercolou?r *?= *?(.+?)/i.test(cellOptFound[1]))
                {
                    cellStyle += `border-color:${cellOptFound[1].split('=')[1].trim()};`
                }
                else if (/borderwidth *?= *?(.+?)/i.test(cellOptFound[1]))
                {
                    cellStyle += `border-width:${cellOptFound[1].split('=')[1].trim()};`
                }
                else if (/backgroundcolou?r *?= *?(.+?)/i.test(cellOptFound[1]))
                {
                    cellStyle += `background-color:${cellOptFound[1].split('=')[1].trim()};`
                }
                else if (/width *?= *?(.+?)/i.test(cellOptFound[1]))
                {
                    cellStyle += `width:${cellOptFound[1].split('=')[1].trim()};`
                }
                else if (/height *?= *?(.+?)/i.test(cellOptFound[1]))
                {
                    cellStyle += `height:${cellOptFound[1].split('=')[1].trim()};`
                }
            }
            cell += `style='${cellStyle}'>${found[2].trim() || ''}</td>`
            l += cell
        }
        l += '</tr>'
        tbody += l
        rowNum++
    })
    colbody += ''
    tbody += '</tbody>'
    res += caption + tbody + '</table>'
    return res
}

function linkFix(t)
{
    const rExec = /^<a.*?>(.*?)<\/a>$/ig.exec(t)
    if (rExec && rExec.length == 2) return rExec[1]
    else return t
}

function blockquote(match, rgx, depth)
{
    if (depth++ >= 10) return match
    let txt = ''
    let lSplit = match.split('\n')
    lSplit.forEach((l, i) =>
    {
        if (l.length < 2) return
        txt += l.substring(1,l.length) + (i + 1 == lSplit.length ? '' : '\n')
    })
   txt = txt.replace(rgx, match => {return blockquote(match, rgx, depth)}).replace(/\n/g, '<br>')
    return `<blockquote class='ren-quote'><table><tbody><tr><td class='ren-quote-content'>${txt}</td><td class='ren-quote-icon'><i class="fa fa-quote-left" aria-hidden="true"></i></td></tr></tbody></table></blockquote>`
}

var currentTOC = undefined
var latestHeading = 7
var toc
var footnotes = []
var footnote
var footnotecount

const ulRegex = /(^|<\/h\d>)((?:\* (?:.+(?:\r?\n|$)))+)/igm
const olRegex = /(^|<\/h\d>)((?:1\.+ (?:.+(?:\r?\n|$)))+)/igm
const blockquoteRegex = /^(>.*(\r?\n|$))+/igm

module.exports = async (pagename, data, _renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={}, renderOptions={}) => //todo: remove pages requirement
{
    //pagename, data, _renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={}, renderOptions={}
    //deprecated options: _renderInclude, redirect
    //initialise
    currentTOC = [undefined, 0, 0, 0, 0, 0] //supports until 5th
    latestHeading = 7
    toc = 'Table of Contents<hr>'


    data = data.replace(/^((?:Option \w+ \w+\r?\n)+)/igm, '')

    /*
    const redrFrom = req === undefined ? undefined : req.query.from
    if (redrFrom !== undefined)
    {
        redirect = false;
        data = `<i>Redirected from <a href="/w/${redrFrom}?redirect=false">${redrFrom}</a></i><br>` + data
    }*/
    //deprecated

    //Redirect
    const redr = data.replace(/^#redirect (.*?)(?:\r?\n)*(#(?:s\d+))?$/ig, (_match, p1, p2, _offset, string, _groups) =>
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
    data = data.replace(/{{{(.+?)}}}/igm, (_match, p1, _offset, _string, _groups) =>
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
    
    //\r\n issue
    data = data.replace(/\r/g, '')

    //headings
    data = data.replace(/^(=+) (.*) =+( )*\r?\n/igm, (_match, p1, p2, _offset, _string, _groups) => renderHeading(p2, p1.length))

    //centred text
    data = data.replace(/\[:\]{{(.*)}}/igm, '<div class="ren-center">$1</div>')
    //left aligned text
    data = data.replace(/\[\(\]{{(.*)}}/igm, '<div class="ren-left">$1</div>')
    //right aligned text
    data = data.replace(/\[\)\]{{(.*)}}/igm, '<div class="ren-right">$1</div>')

    //macro
    //asyncMacro(str, regex, fn, pages)
    data = await asyncMacro(data, /\[(\w*)\((.*?)\)\]/igm, renderMacro, pages, incl)
    //data = data.replace(/\[(.*?)\((.*?)\)\]/igm, (match, p1, p2, offset, string, groups) => {renderMacro(p1, p2, pages)})]

    //ul
    data = data.replace(ulRegex, (match, p1, p2, _offset, _string, _groups) => (p1 + list(p2,'ul'))) //NOTE: must have /n at the end
    //ol
    data = data.replace(olRegex, (match, p1, p2, _offset, _string, _groups) => (p1 + list(p2,'ol')))
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
    data = data.replace(/\[\[(https?:([^|\r\n]*?))\]\]/igm, (_match, p1, _offset, _string, _groups) =>
    {
        return `<a href='${p1}' target='_blank' rel='noopener noreferrer' class='ren-extlink'><i class="fa fa-external-link-square ren-extlink-icon" aria-hidden="true"></i>${p1}</a>`
    })
    //external link with different text
    data = data.replace(/\[\[(https?:.*?)\|(.*?)\]\]/igm, (_match, p1, p2, _offset, _string, _groups) =>
    {
        p2 = linkFix(p2)
        return `<a href='${p1}' target='_blank' rel='noopener noreferrer' class='ren-extlink'><i class="fa fa-external-link-square ren-extlink-icon" aria-hidden="true"></i>${p2}</a>`
    })
    //category
    data = data.replace(/\[\[category:(.*?)\]\]/igm, '')
    //anchor
    data = data.replace(/\[\[#([^|\r\n]*?)\]\]/igm, `<a href='#$1'>$1</a>`)
    //anchor with different text
    data = data.replace(/\[\[(#.*?)\|(.*?)\]\]/igm, `<a href='$1'>$2</a>`)
    //Internal Link
    {
        let r = /\[\[([^|\r\n]*?)\]\]/igm
        const promises = []
        data.replace(r, (_match, p1, _offset, _string, _groups) =>
        {
            let f = async (p1) =>
            {
                let p = await pages.findOne({where: {title: p1}})
                let p1Esc = encodeURIComponent(p1)
                p1Esc = p1Esc.replace(/'/g, '%27')
                let p1Tooltip = p1.replace(/'/g,`&apos;`)
                if (p) return `<a href='/w/${p1Esc}' title='${p1Tooltip}'>${p1}</a>`
                else return `<a href='/w/${p1Esc}' title='${p1Tooltip} (No Such Page)' class='ren_nosuchpage'>${p1}</a>`
            }
            const promise = f(p1)
            promises.push(promise)
        })
        const pData = await Promise.all(promises)
        data = data.replace(r, () => pData.shift())
    }
    /*
    data = data.replace(/\[\[([^|\r\n]*?)\]\]/igm, (_match, p1, _offset, _string, _groups) =>
    {
        return `<a href='/w/${p1}'>${p1}</a>`
    })
    */
   
    //Internal Link with different text
    {
        let r = /\[\[(.*?)\|(.*?)\]\]/igm
        const promises = []
        data.replace(r, (_match, p1, p2, _offset, _string, _groups) =>
        {
            let f = async (p1) =>
            {
                let p = await pages.findOne({where: {title: p1}})
                let p1Esc = encodeURIComponent(p1)
                p1Esc = p1Esc.replace(/'/g, '%27')
                let p1Tooltip = p1.replace(/'/g,`&apos;`)
                if (p) return `<a href='/w/${p1Esc}' title='${p1Tooltip}'>${p2}</a>`
                else return `<a href='/w/${p1Esc}' title='${p1Tooltip} (No Such Page)' class='ren_nosuchpage'>${p2}</a>`
            }
            const promise = f(p1, p2)
            promises.push(promise)
        })
        const pData = await Promise.all(promises)
        data = data.replace(r, () => pData.shift())
    }
    /*
    data = data.replace(/\[\[(.*?)\|(.*?)\]\]/igm, (_match, p1, p2, _offset, _string, _groups) =>
    {
        p2 = linkFix(p2)
        return `<a href='/w/${p1}'>${p2}</a>`
    })
    */

    //footnote
    footnotes = []
    footnote = '<hr><b>Footnotes</b><br>'
    footnotecount = 0
    data = data.replace(/\[\* (.*?)\]/igm, (_match, p1, _offset, _string, _groups) => regFootnote(p1))

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
    //table
    data = data.replace(/(^\|\|(.*?\|\|)+(\r?\n|$))+/igm, (match) =>
    {
        return renderTable(match)
    })
    data = data.replace(/(?:^|>)(:+)(.*)(\r?\n|$)/igm, (match, p1, p2, _offset, _string, _groups) =>
    {
        return (match[0] == '>' ? '>' : '') + `<div style='padding-left: ${5 * p1.length}px'>${p2}</div>`
    })

    //blockquote
    data = data.replace(blockquoteRegex, match => {return blockquote(match, blockquoteRegex, 1)})

    data = data.replace(/```(.*?)```/igms, (match, p1, _offset, _string, _groups) =>
    {
        return p1.replace(/\n/igm, '')
    })
    //remove \r?\n
    data = data.replace(/\n/igm, '<br>')
    //data = data.replace(/^\n/igm, '<br>')
    //data = data.replace('\n', '')
    //escape things
    data = data.replace(/((\\\\|\\))/igm, (_match, p1, _offset, _string, _groups) => {return p1 == '\\' ? '' : '\\\\'})
    //sanitising things
    data = sanitiseHtml(data, global.sanitiseOptions)

    return data
}