import dedent from 'dedent'
import sanitiseHtml from 'sanitize-html'

import { WikiParser } from './wikiparser.js'

const parserInstance = new WikiParser()
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults()

/**
 * Standard renderer
 */
export class HTMLVisitor extends BaseCstVisitor {
    /**
     * Constructor for HTMLVisitor.
     * @param {Object} manifest k-v pairs of data collected by PreprocessVisitor
     * @param {Object} prompts k-v pairs of prompts to show to the user. Required fields: 'edit'
     * @param {Object} options k-v pairs of options.
     * Currently supports: pagename (String), renderSectionEditButton (Boolean, requires pagename)
     */
    constructor(manifest, prompts, options) {
        super()
        this.validateVisitor()
        this.headingCounts = [0, 0, 0, 0, 0, 0]
        this.footnotes = []
        this.footnoteCnt = 0
        this.manifest = manifest
        this.prompts = prompts
        this.options = options || {}
    }

    document(ctx) {
        // reinit'ise temporary variables
        this.headingCounts = [0, 0, 0, 0, 0, 0]
        this.footnotes = []
        this.footnoteCnt = 0

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
        if (!ctx.paragraph) return ''
        return this.visit(ctx.paragraph[0])
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
        this.footnotes.sort()

        let footnote = `<hr><b>${this.prompts.footnotes}</b><br><div id="footnotes">`
        for (const [num, content] of this.footnotes) {
            footnote += `<a id='foot_${num}' href='#foot_source${num}'>[${num}]</a> ${content}<br>`
        }
        footnote += '</div>'
        this.footnotes = []
        return footnote
    }

    paragraph(ctx) {
        const lines = ctx.line.map(line => this.visit(line)).join('<br>')
        return `<p>${lines}</p>`
    }

    line(ctx) {
        if (!ctx.inline) return ''
        return ctx.inline.map(inline => this.visit(inline)).join('')
    }

    inline(ctx) {
        if (ctx.bold) return this.visit(ctx.bold[0])
        if (ctx.italic) return this.visit(ctx.italic[0])
        if (ctx.underline) return this.visit(ctx.underline[0])
        if (ctx.strikethru) return this.visit(ctx.strikethru[0])
        if (ctx.superscript) return this.visit(ctx.superscript[0])
        if (ctx.subscript) return this.visit(ctx.subscript[0])
        if (ctx.big) return this.visit(ctx.big[0])
        if (ctx.anonymousFootnote) return this.visit(ctx.anonymousFootnote[0])
        if (ctx.anonymousFootnoteFallback) return this.visit(ctx.anonymousFootnoteFallback[0])
        if (ctx.SpaceTab) return ctx.SpaceTab[0].image
        if (ctx.Text) return ctx.Text[0].image
        if (ctx.EscapeChar) return ctx.EscapeChar[0].image[1]

        // unmatched delimiters — render as their literal characters
        const orphanedTokens = [
            "LeftAlignOpen", "CenterAlignOpen", "RightAlignOpen", "MultilineClose", "BoldDelim",
            "ItalicDelim", "UnderlineDelim", "SupDelim", "SubDelim", "BigDelim",
            "H1Open", "H1Close", "H2Open", "H2Close", "H3Open",
            "H3Close", "H4Open", "H4Close", "H5Open", "H5Close",
            "H6Open", "H6Close", "FootnoteCloser", "MacroCloser",
            "FootnoteOpener"
        ]
        for (const tokenName of orphanedTokens) {
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

    anonymousFootnoteFallback(ctx) {
        const inner = ctx.line ? ctx.line.map(i => this.visit(i)).join('') : ''
        return `[*${inner}]`
    }
}
