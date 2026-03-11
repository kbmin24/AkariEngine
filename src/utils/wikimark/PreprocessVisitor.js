import { WikiParser } from './wikiparser.js'

const parserInstance = new WikiParser()
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults()

function buildHeadingName(headingCounts, depth, separator = '.') {
    let res = ''
    for (var i = 1; i <= depth; i++) {
        res += headingCounts[i].toString()
        if (i != depth) res += separator
    }
    return res
}

/**
 * Normalises heading depths in the manifest.toc and manifest.headingNames
 * and adjusts names accordingly.
 * @param {Array} toc Array of heading objects.
 * @param {Map} headingNames Map of CST nodes to their names.
 */
function normaliseHeadingDepth(toc, headingNames) {
    // determine 'offset'
    let offset = 6
    for (let i = 0; i < toc.length; i++) {
        offset = Math.min(offset, toc[i].depth - 1)
    }

    if (offset == 6) return // no headings, nothing to normalise

    for (let i = 0; i < toc.length; i++) {
        toc[i].depth -= offset
        toc[i].name = toc[i].name.split('.').slice(offset).join('.')
    }

    for (let k of headingNames.keys()) {
        const name = headingNames.get(k)
        const parts = name.split('.').slice(offset)
        headingNames.set(k, parts.join('.'))
    }
}

/**
 * Visits the CST and creates collects all nodes requiring async processing.
 * Saves the result in .manifest.
 * Warning: document() should only be called ONCE
 */
export class PreprocessVisitor extends BaseCstVisitor {
    constructor() {
        super()
        this.manifest = {
            // each array is Object {name: string, depth: number, node: Byref CSTNode}
            // assumes that it is in order of appearance in the document
            // 'depth' is NOT the heading depth; it is depth relative to 'biggest'
            // heading in the document, e.g. h2 h3 h4 h2 => 1 2 3 2.
            toc: [],

            // node => name
            headingNames: new Map(), //id
            headingTitles: new Map(), //the title shown to user i.e. the text between ='s

            // node => Integer count of when the heading appears (1-indexed)
            headingIndex: new Map()

        }
        this.headingCounts = [0, 0, 0, 0, 0, 0, 0] // 1-based indexing, so [0..6]
        this.nextHeadingIndex = 1
        this.runFirst = true

        this.validateVisitor()
    }

    document(ctx) {
        if (!this.runFirst) {
            throw new Error("document() should only be called ONCE")
        }
        this.runFirst = false

        if (!ctx.block) return //empty document

        for (const block of ctx.block)
            this.visit(block)


        // postprocess: normalise heading 'depths'
        normaliseHeadingDepth(this.manifest.toc, this.manifest.headingNames)
    }

    block(ctx) {
        if (ctx.heading) return this.visit(ctx.heading[0])
    }

    heading(ctx) {
        if (ctx.h1) return this.visit(ctx.h1[0])
        if (ctx.h2) return this.visit(ctx.h2[0])
        if (ctx.h3) return this.visit(ctx.h3[0])
        if (ctx.h4) return this.visit(ctx.h4[0])
        if (ctx.h5) return this.visit(ctx.h5[0])
        if (ctx.h6) return this.visit(ctx.h6[0])
    }

    handleHeadingVisit(ctx, depth, headingCounts) {
        //clear heading counts after current depth
        for (var i = depth + 1; i < headingCounts.length; i++) {
            headingCounts[i] = 0
        }
        headingCounts[depth]++
        const headingName = buildHeadingName(headingCounts, depth)

        this.manifest.headingNames.set(ctx, headingName)
        this.manifest.toc.push({ name: headingName, depth, node: ctx })
        this.manifest.headingIndex.set(ctx, this.nextHeadingIndex++)

        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        this.manifest.headingTitles.set(ctx, inner)
    }

    h1(ctx) {
        this.handleHeadingVisit(ctx, 1, this.headingCounts)
    }

    h2(ctx) {
        this.handleHeadingVisit(ctx, 2, this.headingCounts)
    }

    h3(ctx) {
        this.handleHeadingVisit(ctx, 3, this.headingCounts)
    }

    h4(ctx) {
        this.handleHeadingVisit(ctx, 4, this.headingCounts)
    }

    h5(ctx) {
        this.handleHeadingVisit(ctx, 5, this.headingCounts)
    }

    h6(ctx) {
        this.handleHeadingVisit(ctx, 6, this.headingCounts)
    }


    // inline renderer for TOC
    inline(ctx) {
        if (ctx.bold) return this.visit(ctx.bold[0])
        if (ctx.italic) return this.visit(ctx.italic[0])
        if (ctx.underline) return this.visit(ctx.underline[0])
        if (ctx.strikethru) return this.visit(ctx.strikethru[0])
        if (ctx.superscript) return this.visit(ctx.superscript[0])
        if (ctx.subscript) return this.visit(ctx.subscript[0])
        if (ctx.big) return this.visit(ctx.big[0])
        if (ctx.Text) return ctx.Text[0].image
        if (ctx.EscapeChar) return ctx.EscapeChar[0].image[1]

        // unmatched delimiters — render as their literal characters
        const orphanedTokens = [
            "LeftAlignOpen", "CenterAlignOpen", "RightAlignOpen", "MultilineClose", "BoldDelim",
            "ItalicDelim", "UnderlineDelim", "SupDelim", "SubDelim", "BigDelim",
            "H1Open", "H1Close", "H2Open", "H2Close", "H3Open",
            "H3Close", "H4Open", "H4Close", "H5Open", "H5Close",
            "H6Open", "H6Close",
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
}