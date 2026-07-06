import dedent from 'dedent'
import sanitiseHtml from 'sanitize-html'

import { WikiParser } from './wikiparser.js'
import { macroHandler } from './macro.js'
import { orphanableTokens } from './tokens.js'

import validateColor from 'validate-color'

const parserInstance = new WikiParser()
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults()

/**
 * Standard renderer
 */
export class HTMLVisitor extends BaseCstVisitor {
    initialise() {
        this.headingCounts = [0, 0, 0, 0, 0, 0]
        this.footnotes = []
        this.footnoteCnt = 0
    }
    /**
     * Constructor for HTMLVisitor.
     * @param {Object} [manifest] k-v pairs of data collected by PreprocessVisitor
     * @param {Object} [prompts] k-v pairs of prompts to show to the user.
     * @param {Set<string>} [missingPages] Set of page names that are referenced but not found
     * @param {Object} [macroResult] k-v pairs of macro results resolved by the service.
     * @param {Object} [options] k-v pairs of options.
     * @param {string} [options.pagename] Optional. Page name used for section edit links and autolink detection.
     * @param {boolean} [options.renderSectionEditButton] Optional. Requires `options.pagename`. If true, renders the [edit] button next to each heading.
     * @param {boolean} [options.isTemplate] Optional. If true, paragraphs render as spans to prevent unwanted margins.
     * @param {Object} [options.args] Optional. k-v pairs of template options.
     */
    constructor(manifest, prompts, missingPages, macroResult, options) {
        super()
        this.validateVisitor()
        this.initialise()
        this.manifest = manifest
        this.prompts = prompts
        this.missingPages = missingPages
        this.macroResult = macroResult || {}
        this.options = options || {}
    }

    document(ctx) {
        // reinit'ise temporary variables
        this.initialise()

        if (!ctx.block) return '' //empty document

        let result = ctx.block.map(block => this.visit(block)).join('')
        result += this.footnoteList(null)
        return result
    }

    block(ctx) {
        if (ctx.heading) return this.visit(ctx.heading[0])
        if (ctx.leftalign) return this.visit(ctx.leftalign[0])
        if (ctx.centeralign) return this.visit(ctx.centeralign[0])
        if (ctx.rightalign) return this.visit(ctx.rightalign[0])
        if (ctx.TOCBox) return this.visit(ctx.TOCBox[0])
        if (ctx.footnoteList) return this.visit(ctx.footnoteList[0])
        if (ctx.blockquote) return this.visit(ctx.blockquote[0])
        if (ctx.unorderedList) return this.visit(ctx.unorderedList[0])
        if (ctx.orderedList) return this.visit(ctx.orderedList[0])
        if (ctx.fencedCode) return this.visit(ctx.fencedCode[0])
        if (ctx.multilineMacro) return this.visit(ctx.multilineMacro[0])
        if (ctx.table) return this.visit(ctx.table[0])
        if (ctx.FencedCode) return ctx.FencedCode[0].image.trimEnd()
        if (!ctx.paragraph) return ''
        return this.visit(ctx.paragraph[0])
    }

    multilineMacro(ctx) {
        const { name, content } = ctx.MultilineMacro[0].payload
        const { result, output } = macroHandler(name, content, this.macroResult)
        if (result === 'unprocessed') return ctx.MultilineMacro[0].image
        return output
    }

    table(ctx) {
        let innerHTML = ''
        let tableOptions = []
        for (const row of ctx.tableRow ?? []) {
            const { html: rowHtml, tableOptions: rowOptions } = this.visit(row)
            innerHTML += rowHtml
            tableOptions.push(...rowOptions)
        }

        const props = this.#aggregateTableOptions(tableOptions)
        const style = this.#buildTableStyle(props)
        const captionHTML = props.caption ? `<caption style='text-align:center'>${props.caption}</caption>` : ''

        return `<table class="table table-bordered ren-table" style="${style}">${captionHTML}<tbody>${innerHTML}</tbody></table>`
    }

    #aggregateTableOptions(tableOptions) {
        let tableFloat, caption, borderColor, borderWidth, bgColor, width, maxWidth, height
        let noMargin = false
        for (const option of tableOptions) {
            // honour values seen first
            switch (option.option) {
                case 'float-left': tableFloat ??= 'left'; break
                case 'float-right': tableFloat ??= 'right'; break
                case 'float-center': tableFloat ??= 'center'; break
                case 'caption': caption ??= option.value; break
                case 'tableBorderColor': borderColor ??= option.value; break
                case 'tableBorderWidth': borderWidth ??= option.value; break
                case 'tableBgColor': bgColor ??= option.value; break
                case 'width': width ??= option.value; break
                case 'maxWidth': maxWidth ??= option.value; break
                case 'height': height ??= option.value; break
                case 'noMargin': noMargin = true; break
            }
        }
        return { tableFloat, caption, borderColor, borderWidth, bgColor, width, maxWidth, height, noMargin }
    }

    #buildTableStyle({ tableFloat, borderColor, borderWidth, bgColor, width, height, maxWidth, noMargin }) {
        let style = ''
        if (tableFloat === 'center') style += 'margin-left: auto; margin-right: auto;'
        else if (tableFloat) style += `float: ${tableFloat};`
        if (borderColor) style += `border-color: ${borderColor};`
        if (borderWidth) style += `border-width: ${borderWidth};`
        if (bgColor) style += `background-color: ${bgColor};`
        if (width) style += `width: ${width};`
        if (height) style += `height: ${height};`
        if (maxWidth) style += `max-width: ${maxWidth};`
        if (noMargin) style += 'margin: 0;'
        return style
    }

    tableRow(ctx) {
        let innerHTML = ''
        let rowBgColor = undefined
        let tableOptions = []

        const lines = ctx.line ?? []
        for (let i = 0; i < lines.length; i++) {
            // cell 0 options come from TableDelimStart; cell i>0 options from TableDelim[i-1]
            const delimTok = i === 0
                ? ctx.TableDelimStart[0]
                : ctx.TableDelim[i - 1]
            const optionsStr = delimTok.payload?.options ?? ''
            const options = [...optionsStr.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].trim())
            const { tableOptions: cellTableOpts, rowBgColor: cellRowBgColor, cellStyle, cellAttrs } =
                this.#parseCellOptions(options)
            const inner = this.visit(lines[i])
            innerHTML += `<td ${cellAttrs}style="${cellStyle}">${inner}</td>`
            tableOptions.push(...cellTableOpts)
            if (rowBgColor === undefined) rowBgColor = cellRowBgColor
        }

        const rowStyle = rowBgColor ? `style="background-color: ${rowBgColor};"` : ''
        return {
            html: `<tr ${rowStyle}>${innerHTML}</tr>`,
            tableOptions
        }
    }

    #parseCellOptions(options) {
        const tableOptions = []
        let rowBgColor
        let cellStyle = ''
        let cellAttrs = ''

        for (const option of options) {
            // --- Table-level options ---
            const tableFloatMatch = option.match(/^tablefloat *= *(.+)$/i)
            if (tableFloatMatch) {
                const dir = tableFloatMatch[1].toLowerCase()
                if (dir === 'left' || dir === 'right' || dir === 'center')
                    tableOptions.push({ option: `float-${dir}` })
                continue
            }

            const captionMatch = option.match(/^caption *= *(.+)$/i)
            if (captionMatch) {
                tableOptions.push({ option: 'caption', value: captionMatch[1] })
                continue
            }

            const tableBorderColorMatch = option.match(/^tablebordercolor=(.+)$/i)
            if (tableBorderColorMatch) {
                tableOptions.push({ option: 'tableBorderColor', value: tableBorderColorMatch[1] })
                continue
            }

            const tableBorderWidthMatch = option.match(/^tableborderwidth=(.+)$/i)
            if (tableBorderWidthMatch) {
                tableOptions.push({ option: 'tableBorderWidth', value: tableBorderWidthMatch[1] })
                continue
            }

            const tableBgColorMatch = option.match(/^table(?:background|bg)color=(.+)$/i)
            if (tableBgColorMatch) {
                tableOptions.push({ option: 'tableBgColor', value: tableBgColorMatch[1] })
                continue
            }

            const tableWidthMatch = option.match(/^tablewidth=(.+)$/i)
            if (tableWidthMatch) {
                tableOptions.push({ option: 'width', value: tableWidthMatch[1] })
                continue
            }

            const tableMaxWidthMatch = option.match(/^tablemaxwidth=(.+)$/i)
            if (tableMaxWidthMatch) {
                tableOptions.push({ option: 'maxWidth', value: tableMaxWidthMatch[1] })
                continue
            }

            const tableHeightMatch = option.match(/^tableheight=(.+)$/i)
            if (tableHeightMatch) {
                tableOptions.push({ option: 'height', value: tableHeightMatch[1] })
                continue
            }

            if (option.toLowerCase() === 'nomargin') {
                tableOptions.push({ option: 'noMargin' })
                continue
            }

            // --- Row-level options ---
            const rowBgColorMatch = option.match(/^row(?:background|bg)color=(.+)$/i)
            if (rowBgColorMatch) {
                rowBgColor ??= rowBgColorMatch[1]
                continue
            }

            // --- Cell-level options ---
            const colspanMatch = option.match(/^-(\d+)$/)
            if (colspanMatch) {
                cellAttrs += `colspan="${colspanMatch[1]}" `
                continue
            }

            const rowspanMatch = option.match(/^\|(\d+)$/)
            if (rowspanMatch) {
                cellAttrs += `rowspan="${rowspanMatch[1]}" `
                continue
            }

            switch (option) {
                case ':': cellStyle += 'text-align: center;'; continue
                case '(': cellStyle += 'text-align: left;'; continue
                case ')': cellStyle += 'text-align: right;'; continue
                case '^': cellStyle += 'vertical-align: top;'; continue
                case '=': cellStyle += 'vertical-align: middle;'; continue
                case 'v': cellStyle += 'vertical-align: bottom;'; continue
            }

            const borderColorMatch = option.match(/^bordercolor=(.+)$/i)
            if (borderColorMatch) {
                cellStyle += `border-color: ${borderColorMatch[1]};`
                continue
            }

            const borderWidthMatch = option.match(/^borderwidth=(.+)$/i)
            if (borderWidthMatch) {
                cellStyle += `border-width: ${borderWidthMatch[1]};`
                continue
            }

            const bgColorMatch = option.match(/^(?:bg|background)color=(.+)$/i)
            if (bgColorMatch) {
                cellStyle += `background-color: ${bgColorMatch[1]};`
                continue
            }

            const widthMatch = option.match(/^width=(.+)$/i)
            if (widthMatch) {
                cellStyle += `width: ${widthMatch[1]};`
                continue
            }

            const heightMatch = option.match(/^height=(.+)$/i)
            if (heightMatch) {
                cellStyle += `height: ${heightMatch[1]};`
                continue
            }

            if (validateColor.default(option)) {
                cellStyle += `background-color: ${option};`
            }
        }

        return { tableOptions, rowBgColor, cellStyle, cellAttrs }
    }

    fencedCode(ctx) {
        const prev = this.options.noBreak
        this.options.noBreak = true
        const inner = ctx.block ? ctx.block.map(b => this.visit(b)).join('') : ''
        this.options.noBreak = prev
        return inner
    }

    heading(ctx) {
        if (ctx.h1) return this.visit(ctx.h1[0])
        if (ctx.h2) return this.visit(ctx.h2[0])
        if (ctx.h3) return this.visit(ctx.h3[0])
        if (ctx.h4) return this.visit(ctx.h4[0])
        if (ctx.h5) return this.visit(ctx.h5[0])
        if (ctx.h6) return this.visit(ctx.h6[0])
    }

    handleHeadingVisit(ctx, depth) {
        const headingName = this.manifest.headingNames.get(ctx)
        const headingIndex = this.manifest.headingIndex.get(ctx)
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''

        const editButton = this.options.renderSectionEditButton ?
            `<a href="/edit/${this.options.pagename}?section=${headingIndex}" class="ren-header-edit">[${this.prompts.edit}]</a>` : ''

        return dedent`
            <h${depth} class='border-bottom ren-header' id='s${headingName}'>
            <a href='#toc'>${headingName}.</a> ${inner.trim()} ${editButton}
            </h${depth}>
        `
    }

    h1(ctx) {
        return this.handleHeadingVisit(ctx, 1)
    }

    h2(ctx) {
        return this.handleHeadingVisit(ctx, 2)
    }

    h3(ctx) {
        return this.handleHeadingVisit(ctx, 3)
    }

    h4(ctx) {
        return this.handleHeadingVisit(ctx, 4)
    }

    h5(ctx) {
        return this.handleHeadingVisit(ctx, 5)
    }

    h6(ctx) {
        return this.handleHeadingVisit(ctx, 6)
    }

    leftalign(ctx) {
        const inner = ctx.block ? ctx.block.map(block => this.visit(block)).join('') : ''
        return `<div class="ren-left">${inner}</div>`
    }

    centeralign(ctx) {
        const inner = ctx.block ? ctx.block.map(block => this.visit(block)).join('') : ''
        return `<div class="ren-center">${inner}</div>`
    }

    rightalign(ctx) {
        const inner = ctx.block ? ctx.block.map(block => this.visit(block)).join('') : ''
        return `<div class="ren-right">${inner}</div>`
    }

    TOCBox(_ctx) {
        // build TOC from manifest
        let toc = `<div id='toc' class='border m-3 s-0 me-0 p-3 ren-toc'>`
        toc += `<div style="font-weight:bold;margin-bottom: 1rem;">${this.prompts.toc}</div>`
        for (let item of this.manifest.toc) {
            // indent
            for (let i = 1; i < item.depth; i++) toc += '&emsp;'

            let headingname = this.manifest.headingTitles.get(item.node)
            toc += `<a href='#s${item.name}'>${item.name}.&nbsp;<span class='blackln'>${headingname}</span></a><br>`
        }
        toc += '</div>'
        return toc
    }

    footnoteList(_ctx) {
        if (this.footnotes.length === 0) return ''

        // somehow just running sort results in 1>10...
        this.footnotes.sort((a, b) => a[0] - b[0])

        let footnote = `<hr><b>${this.prompts.footnotes}</b><br><div id="footnotes">`
        for (const [num, content] of this.footnotes) {
            footnote += `<a id='foot_${num}' href='#foot_source${num}'>[${num}]</a> ${content}<br>`
        }
        footnote += '</div>'
        this.footnotes = []
        return footnote
    }

    paragraph(ctx) {
        if (this.options.noBreak) {
            return ctx.line.map(line => this.visit(line)).join('')
        }
        const lines = ctx.line.map(line => this.visit(line)).join('<br>')
        if (this.options.isTemplate) return `<span>${lines}</span>`
        return `<p>${lines}</p>`
    }

    line(ctx) {
        if (!ctx.inline) return ''
        return ctx.inline.map(inline => this.visit(inline)).join('')
    }

    inline(ctx) {
        if (ctx.Macro) {
            const { result, output } = macroHandler(ctx.Macro[0].payload.name, ctx.Macro[0].payload.option, this.macroResult)
            if (result === 'unprocessed') return ctx.Macro[0].image
            else return output
        }
        if (ctx.templateArg) return this.visit(ctx.templateArg[0])
        if (ctx.bold) return this.visit(ctx.bold[0])
        if (ctx.italic) return this.visit(ctx.italic[0])
        if (ctx.underline) return this.visit(ctx.underline[0])
        if (ctx.strikethru) return this.visit(ctx.strikethru[0])
        if (ctx.superscript) return this.visit(ctx.superscript[0])
        if (ctx.subscript) return this.visit(ctx.subscript[0])
        if (ctx.big) return this.visit(ctx.big[0])
        if (ctx.anonymousFootnote) return this.visit(ctx.anonymousFootnote[0])
        if (ctx.anonymousFootnoteFallback) return this.visit(ctx.anonymousFootnoteFallback[0])
        if (ctx.simpleLink) return this.visit(ctx.simpleLink[0])
        if (ctx.namedLink) return this.visit(ctx.namedLink[0])
        if (ctx.SpaceTab) return ctx.SpaceTab[0].image
        if (ctx.Text) return ctx.Text[0].image
        if (ctx.EscapeChar) return ctx.EscapeChar[0].image[1]

        if (ctx.DisplayMath) {
            const content = ctx.DisplayMath[0].payload.content
            return `<span class='mathd'>${content}</span>`
        }

        if (ctx.InlineMath) {
            const content = ctx.InlineMath[0].payload.content
            return `<span class='math'>${content}</span>`
        }

        // unmatched delimiters, render as their literal characters
        for (const tokenName of orphanableTokens) {
            if (ctx[tokenName]) return ctx[tokenName][0].image
        }

        return ''
    }

    bold(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<span class="ren-textbf">${inner}</span>`
    }

    italic(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<span class="ren-italic">${inner}</span>`
    }

    underline(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<span class="ren-underline">${inner}</span>`
    }

    strikethru(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<s>${inner}</s>`
    }

    superscript(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<sup>${inner}</sup>`
    }

    subscript(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<sub>${inner}</sub>`
    }

    big(ctx) {
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<span class="ren-big">${inner}</span>`
    }

    anonymousFootnote(ctx) {
        // computing this later breaks footnotes within footnotes
        let footnoteCount = ++this.footnoteCnt
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        this.footnotes.push([footnoteCount, inner])

        return dedent`
        <span   class='fn_origin fn_origin_unprocessed'
                data-x='${footnoteCount}'
                data-y='${sanitiseHtml(inner, { allowedTags: [], allowedAttributes: {} })}'>\
            ${inner}
        </span>`
    }

    blockquote(ctx) {
        const items = (ctx.blockquoteItem ?? []).map(item => this.visit(item))
        return this.renderBlockquote(items)
    }

    blockquoteItem(ctx) {
        const depth = ctx.BQBullet[0].image.length
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        return { depth, inner }
    }

    renderBlockquote(items) {
        const BQ_OPENER = `<blockquote class='ren-quote'><table><tbody><tr><td class='ren-quote-content'>`
        const BQ_CLOSER = `</td><td class='ren-quote-icon'><i class="fa fa-quote-left" aria-hidden="true"></i></td></tr></tbody></table></blockquote>`

        let result = ''
        let prevLevel = 0
        for (let { depth, inner } of items) {
            depth = Math.min(depth, 10)
            if (prevLevel < depth) {
                for (let i = 0; i < depth - prevLevel; i++)
                    result += BQ_OPENER
                result += inner
            } else if (prevLevel > depth) {
                for (let i = 0; i < prevLevel - depth; i++)
                    result += BQ_CLOSER
                result += inner
            } else {
                result += '<br>' + inner
            }
            prevLevel = depth
        }

        // flush remaining open blockquotes
        for (let i = 0; i < prevLevel; i++)
            result += BQ_CLOSER

        return result
    }

    unorderedList(ctx) {
        const items = (ctx.unorderedListItem ?? []).map(item => this.visit(item))
        return this.renderList(items, 'ul')
    }

    unorderedListItem(ctx) {
        const depth = ctx.ULBullet[0].image.length
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        return { depth, inner }
    }

    orderedList(ctx) {
        const items = (ctx.orderedListItem ?? []).map(item => this.visit(item))
        return this.renderList(items, 'ol')
    }

    orderedListItem(ctx) {
        const depth = ctx.OLBullet[0].image.length
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        return { depth, inner }
    }

    // items: [{depth, inner}...], tagname: ul or li
    renderList(items, tagname) {
        let result = ''
        let prevLevel = 0
        let opener = `<${tagname}>`
        let closer = `</${tagname}>`
        for (let { depth, inner } of items) {
            depth = Math.min(depth, 10)
            if (prevLevel < depth) {
                for (let i = 0; i < depth - prevLevel; i++)
                    result += opener + '<li>'
                result += `${inner}</li>`
            }
            else if (prevLevel > depth) {
                for (let i = 0; i < prevLevel - depth; i++)
                    result += closer + '</li>'
                result += `<li>${inner}</li>`
            }
            else {
                result += `<li>${inner}</li>`
            }
            prevLevel = depth
        }

        // flush
        for (let i = 1; i < prevLevel; i++)
            result += closer + '</li>'
        result += closer

        return result
    }

    anonymousFootnoteFallback(ctx) {
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        return `[*${inner}]`
    }

    #targetFromCtx(ctx) {
        return (ctx.linkTargetToken ?? [])
            .map(node => Object.values(node.children)[0][0].image)
            .join('')
    }

    #encodeTargetExternal(target) {
        return encodeURI(target).replace(/'/g, '%27').replace(/"/g, '%22')
    }

    #encodeTarget(target) {
        return encodeURIComponent(target).replace(/'/g, '%27').replace(/"/g, '%22')
    }

    #renderLink(target, display) {
        const titleAttr = target.replace(/"/g, '&quot;')
        if (target.startsWith('http:') || target.startsWith('https:')) {
            return dedent`<a href='${this.#encodeTargetExternal(target)}'
            target='_blank'
            data-is-external='true'
            rel='nofollow noopener noreferrer'
            title='${titleAttr}'
            class='ren-extlink'>
                <i class="fas fa-external-link-square-alt ren-extlink-icon"></i>
                ${display}
            </a>`
        }

        // could be false negative if the link goes like pagename#s1.1
        const autoLinkClass = target == this.options.pagename ? 'ren_thispage' : ''
        const isMissing = this.missingPages.has(target)
        const page404Prompt = isMissing ? ` (${this.prompts.page404})` : ''
        const page404class = isMissing ? 'ren_nosuchpage' : ''
        return dedent`<a href="/w/${this.#encodeTarget(target)}"
        title="${titleAttr}${page404Prompt}"
        class="${autoLinkClass} ${page404class}">${display}</a>`
    }

    simpleLink(ctx) {
        const target = this.#targetFromCtx(ctx)
        return this.#renderLink(target, target)
    }

    namedLink(ctx) {
        const target = this.#targetFromCtx(ctx)
        const display = ctx.line ? this.visit(ctx.line[0]) : target
        return this.#renderLink(target, display)
    }

    templateArg(ctx) {
        const name = ctx.line ? this.#rawText(ctx.line[0]) : ''
        const value = this.options.args?.[name]
        if (value !== undefined) return value
        return ctx.line ? this.visit(ctx.line[0]) : ''
    }

    #rawText(node) {
        if ('image' in node) return node.image
        return Object.values(node.children)
            .flat()
            .sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0))
            .map(n => this.#rawText(n))
            .join('')
    }
}
