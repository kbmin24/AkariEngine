/* eslint-disable no-unused-vars */
//This function:
//gets markup and returns HTML.

const dateandtime = require('date-and-time')
const katex = require('katex');
var sanitiseHtml = require('sanitize-html')
async function renderMacro(match, macro, args, pages = undefined, files, incl = true)
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
            let ok = true
            for (let val of options)
            {
                let j = 0
                for(let reg of properties)
                {
                    if (reg.test(val.trim()))
                    {
                        if (j == 0)
                        {
                            filename = val
                            let f = await files.findOne({where: {filename: filename}})
                            if (f === null)
                            {
                                ok = false
                            }
                            else
                            {
                                res += 'src=\'/uploads/'//src
                            }
                        }
                        res += val
                        if (j == 0) res += '\''
                        res += ' ' 
                    }
                    j++;
                }
            }
            if (!ok) return match
            return `<a href='/w/File:${filename}'><img ${res} class='ren-img img-fluid'></a>`
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
                        return `<p class="fw-bold text-danger">INCLUDE 매크로 오류: 인수 ${args[i]}의 값이 없습니다.</p>`
                    }
                    const k = args[i].substring(0,eqSign).trim()
                    const v = args[i].substring(eqSign + 1).trim()
                    temArgs[k] = v
                }
                const res = await require(global.path + '/pages/render.js')(p.title, p.content, true, pages, files, undefined, undefined, false, false, temArgs)
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
            const ifr = `<iframe class='ren-yt' width="560" height="315" src="https://www.youtube-nocookie.com/embed/${args}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
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
                return '<p class="fw-bold text-danger">DDAY 오류: 잘못된 날짜 형식</p>'
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
                return '<p class="fw-bold text-danger">AGEK 오류: 잘못된 날짜 형식</p>'
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
                    return '<p class="fw-bold text-danger">AGE 오류: 잘못된 날짜 형식</p>'
                }
            }
        case 'math':
            {
                args = args.replace(/\\/gi, '\\\\') //backslash,
                            .replace(/\n/gi, '') //linebreak dosent' matter in latex
                return `<span class='math'>${args}</span>`
            }
        case 'map':
            {
                args = args.split('|')
                let datax = null
                let datay = null
                let dataz = null
                let dataloc = null
                let width = null
                let height = null
                for (let arg of args)
                {
                    let as = arg.split('=')
                    if (as.length != 2) continue
                    as[0] = as[0].trim()
                    as[1] = as[1].trim()
                    switch (as[0])
                    {
                        case 'x':
                            {
                                datax = parseFloat(as[1])
                                break
                            }
                        case 'y':
                            {
                                datay = parseFloat(as[1])
                                break
                            }
                        case 'z':
                            {
                                let tmp = parseInt(as[1])
                                if (1 <= tmp && tmp <= 14)
                                {
                                    dataz = tmp
                                }
                                break
                            }
                        case 'width':
                            {
                                width = as[1]
                                break
                            }
                        case 'height':
                            {
                                height = as[1]
                                break
                            }
                    }
                }
                let opt = ''
                if (datax) opt += ` data-x="${datax}"`
                if (datay) opt += ` data-y="${datay}"`
                opt += ` data-z="${dataz || 5}"` //3 is the default

                let style = ''
                style += `width:${width || '300px'};`
                style += `height:${height || '300px'};`
                
                return `<div class='map' ${opt}' style='${style}'></div>`
            }
        default:
            return match
            //return '<p class="fw-bold text-danger">UNDEFINED MACRO ERROR: Macro with name "' + macro + '" does not exist.'
    }
}
async function asyncMacro(str, regex, fn, pages, files, incl=true)
{
    //https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
    const promises = []
    str.replace(regex, (match, p1, p2, _offset, _string, _groups) =>
    {
        const promise = fn(match, p1, p2, pages, files, incl)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
}
function list(line, type)
{
    opentag = '<' + type + '>'
    closetag = '</' + type + '>'
    liIdentifier = null
    if (type == 'ol')
    {
        liIdentifier = /(#+) (.+)/i
    }
    else
    {
        liIdentifier = /(\*+) (.+)/i
    }
    //type: ul, ol
    line = line.trim()
    var res = ''
    const r = /^<\/h\d>(.*)$/s
    if (r.test(line))
    {
        res += '</h2>'
        line = line.replace(r, '$1')
    }
    var currentLevel = 0
    var lines = line.split(/\r?\n/)
    lines.forEach((item, _index, _a) =>
    {
        var e = liIdentifier.exec(item)
        var newLevel = e[1].length
        while (currentLevel < newLevel)
        {
            res += opentag
            currentLevel++
        }
        while (currentLevel > newLevel)
        {
            res += closetag
            currentLevel--
        }
        res += `<li>${e[2]}</li>`
    })
    while (currentLevel)
    {
        res+= closetag
        currentLevel -= 1
    }
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
    let editButton = renderSectionEditButton ? `<a class='ren-header-edit' href='/edit/${pgname}?section=${currentSection++}'>[편집]</a>` : ''
    var res = `<h${depth+1} class='border-bottom ren-header' id='s${buildHeadingName(depth, '_')}'><a href='#toc'>${buildHeadingName(depth, '.')}.</a> ${text} ${editButton}</h${depth+1}>\n` //<a href='#s${buildHeadingName(depth, '_')}'>¶</a>

    //update TOC
    for (let i = 1; i < depth; i++) toc += '&emsp;'
    toc += `<a href='#s${buildHeadingName(depth, '_')}'>${buildHeadingName(depth, '.')}.&nbsp;<span class='blackln'>${text}</span></a><br>`
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
    return `<sup><a href='#foot_${footnotecount}' id='foot_source${footnotecount}' title='${sanitiseHtml(text, {allowedTags: [], allowedAttributes: {}})}'>[${footnotecount}]</a></sup>`
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
        return true
    }
    else return '<p><span class="fw-bold text-danger">리다이렉트 오류</span>: 리다이렉트는 일반 문서에서만 할 수 있습니다.</p>'
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
        else if (firstCellOptFound[1].trim() == 'nomargin')
        {
            tableStyle += 'margin: 0px;'
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

function linkfix(t)
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

var pgname
var currentTOC = undefined
var currentSection = 1
var latestHeading = 7
var toc
var footnotes = []
var footnote
var footnotecount
var renderSectionEditButton = true

const ulRegex = /(^|<\/h\d>)((?:\*+ (?:.+(?:\r?\n|$)))+)/igm
const olRegex = /(^|<\/h\d>)((?:#+ (?:.+(?:\r?\n|$)))+)/igm
const blockquoteRegex = /^(>.*(\r?\n|$))+/igm

module.exports = async (pagename, data, _renderInclude, pages = undefined, files = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={}, renderOptions={}) => //todo: remove pages requirement
{
    //pagename, data, _renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={}, renderOptions={}
    //deprecated options: _renderInclude, redirect
    //initialise
    pgname = pagename
    currentSection = 1
    currentTOC = [undefined, 0, 0, 0, 0, 0] //supports until 5th
    latestHeading = 7
    toc = '<div style="font-weight:bold;margin-bottom: 1rem;">목차</div>'

    if (renderOptions.showSectionEditButton == 'on')
    {
        renderSectionEditButton = true
    }
    else
    {
        renderSectionEditButton = false
    }


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
    let doRedr = false
    const redr = data.replace(/^#redirect (.*?)(?:\r?\n)*(#(?:s\d+))?$/ig, (_match, p1, p2, _offset, string, _groups) =>
    {
        if (true === fredirect(pagename, p1, p2, string, res, redirect))
        {
            doRedr = true
            return true
        }
    })
    if (doRedr === true)
    {
        return true
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

    //comments
    data = data.replace(/^##.*?\r?\n/igm, '')
    
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
    data = await asyncMacro(data, /\[(\w*)(?:\((.*?)\))?\]/igms, renderMacro, pages, files, incl)
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
        p1 = linkfix(p1)
        let p1Tooltip = p1.replace(/'/g,`&apos;`)
        return `<a href='${p1}' target='_blank' rel='noopener noreferrer' title='${p1Tooltip}' class='ren-extlink'><i class="fas fa-external-link-square-alt ren-extlink-icon"></i>${p1}</a>`
    })
    //external link with different text
    data = data.replace(/\[\[(https?:.*?)\|(.*?)\]\]/igm, (_match, p1, p2, _offset, _string, _groups) =>
    {
        p2 = linkfix(p2)
        let p1Tooltip = p1.replace(/'/g,`&apos;`)
        return `<a href='${p1}' target='_blank' rel='noopener noreferrer' title='${p1Tooltip}' class='ren-extlink'><i class="fas fa-external-link-square-alt ren-extlink-icon"></i>${p2}</a>`
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
            p1 = linkfix(p1)
            let f = async (p1) =>
            {
                let p = await pages.findOne({where: {title: p1}})
                let p1Esc = encodeURIComponent(p1)
                p1Esc = p1Esc.replace(/'/g, '%27')
                let p1Tooltip = p1.replace(/'/g,`&apos;`)

                let p_me = (pagename == p1) ? 'ren_thispage' : ''
                if (p) return `<a href='/w/${p1Esc}' title='${p1Tooltip}' class='${p_me}'>${p1}</a>`
                else return `<a href='/w/${p1Esc}' title='${p1Tooltip} (No Such Page)' class='ren_nosuchpage ${p_me}'>${p1}</a>`
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
            p2 = linkfix(p2)
            let f = async (p1, p2) =>
            {
                let p = await pages.findOne({where: {title: p1}})
                let p1Esc = encodeURIComponent(p1)
                p1Esc = p1Esc.replace(/'/g, '%27')
                let p1Tooltip = p1.replace(/'/g,`&apos;`)
                let p_me = (pagename == p1) ? 'ren_thispage' : ''
                if (p) return `<a href='/w/${p1Esc}' title='${p1Tooltip}' class='${p_me}'>${p2}</a>`
                else return `<a href='/w/${p1Esc}' title='${p1Tooltip} (존재하지 않는 페이지)' class='ren_nosuchpage ${p_me}'>${p2}</a>`
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
    footnote = '<hr><b>각주</b><br>'
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
    data = data.replace(/(<\/h\d>)\n/igm, (match, p1, offset, input) =>
        {
            return p1
        })
    data = data.replace(/\n/igm, '<br>')
    data = data.replace(/(<br>)?<hr>(<br>)?/igm, '<hr>')
    //data = data.replace(/^\n/igm, '<br>')
    //data = data.replace('\n', '')
    //escape things
    data = data.replace(/((\\\\|\\))/igm, (_match, p1, _offset, _string, _groups) => {return p1 == '\\' ? '' : '\\'})
    //sanitising things
    data = sanitiseHtml(data, global.sanitiseOptions)

    return data
}