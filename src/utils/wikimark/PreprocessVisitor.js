import { WikiParser } from './wikiparser.js'
import { getMacroRequest } from './macro.js'
import { orphanableTokens } from './tokens.js'

const parserInstance = new WikiParser()
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults()

function buildHeadingName(headingCounts, depth, separator = '.') {
    let res = ''
    for (let i = 1; i <= depth; i++) {
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

    initialise() {
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
            headingIndex: new Map(),

            pageRefs: new Set(),

            // {repo, query}
            macroRequests: [],

        }
        this.headingCounts = [0, 0, 0, 0, 0, 0, 0] // 1-based indexing, so [0..6]
        this.nextHeadingIndex = 1
    }

    constructor() {
        super()
        this.initialise()
        this.validateVisitor()
    }

    document(ctx) {
        if (!ctx.block) return //empty document

        for (const block of ctx.block)
            this.visit(block)

        // postprocess: normalise heading 'depths'
        normaliseHeadingDepth(this.manifest.toc, this.manifest.headingNames)
    }

    block(ctx) {
        if (ctx.heading) this.visit(ctx.heading[0])
        if (ctx.leftalign) this.visit(ctx.leftalign[0])
        if (ctx.centeralign) this.visit(ctx.centeralign[0])
        if (ctx.rightalign) this.visit(ctx.rightalign[0])
        if (ctx.TOCBox) this.visit(ctx.TOCBox[0])
        if (ctx.footnoteList) this.visit(ctx.footnoteList[0])
        if (ctx.unorderedList) this.visit(ctx.unorderedList[0])
        if (ctx.orderedList) this.visit(ctx.orderedList[0])
        if (ctx.fencedCode) this.visit(ctx.fencedCode[0])
        if (ctx.table) this.visit(ctx.table[0])
        if (!ctx.paragraph) return
        this.visit(ctx.paragraph[0])
    }

    heading(ctx) {
        if (ctx.h1) this.visit(ctx.h1[0])
        if (ctx.h2) this.visit(ctx.h2[0])
        if (ctx.h3) this.visit(ctx.h3[0])
        if (ctx.h4) this.visit(ctx.h4[0])
        if (ctx.h5) this.visit(ctx.h5[0])
        if (ctx.h6) this.visit(ctx.h6[0])
    }

    handleHeadingVisit(ctx, depth, headingCounts) {
        //clear heading counts after current depth
        for (let i = depth + 1; i < headingCounts.length; i++) {
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

    leftalign(ctx) {
        if (ctx.block) ctx.block.forEach(block => this.visit(block))
    }

    centeralign(ctx) {
        if (ctx.block) ctx.block.forEach(block => this.visit(block))
    }

    rightalign(ctx) {
        if (ctx.block) ctx.block.forEach(block => this.visit(block))
    }

    TOCBox(_ctx) { }

    footnoteList(_ctx) { }

    paragraph(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    line(ctx) {
        if (ctx.inline) ctx.inline.forEach(inline => this.visit(inline))
    }

    inline(ctx) {
        if (ctx.Macro) {
            const req = getMacroRequest(ctx.Macro[0].payload.name, ctx.Macro[0].payload.option)
            if (req) this.manifest.macroRequests.push(req)
        }
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

        // unmatched delimiters — render as their literal characters

        for (const tokenName of orphanableTokens) {
            if (ctx[tokenName]) return ctx[tokenName][0].image
        }

        return ''
    }

    bold(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    italic(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    underline(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    strikethru(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    superscript(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    subscript(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    big(ctx) {
        if (ctx.inline) ctx.inline.forEach(i => this.visit(i))
    }

    anonymousFootnote(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    unorderedList(ctx) {
        if (ctx.unorderedListItem) ctx.unorderedListItem.forEach(item => this.visit(item))
    }

    unorderedListItem(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    orderedList(ctx) {
        if (ctx.orderedListItem) ctx.orderedListItem.forEach(item => this.visit(item))
    }

    orderedListItem(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    fencedCode(ctx) {
        if (ctx.block) ctx.block.forEach(block => this.visit(block))
    }

    table(ctx) {
        if (ctx.tableRow) ctx.tableRow.forEach(row => this.visit(row))
    }

    tableRow(ctx) {
        if (ctx.tableCell) ctx.tableCell.forEach(cell => this.visit(cell))
    }

    tableCell(ctx) {
        if (ctx.line) this.visit(ctx.line[0])
    }

    anonymousFootnoteFallback(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    templateArg(ctx) {
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }

    #targetFromCtx(ctx) {
        return (ctx.linkTargetToken ?? [])
            .map(node => Object.values(node.children)[0][0].image)
            .join('')
    }

    simpleLink(ctx) {
        if (ctx.linkTargetToken) {
            this.manifest.pageRefs.add(this.#targetFromCtx(ctx))
        }
    }

    namedLink(ctx) {
        if (ctx.linkTargetToken) {
            this.manifest.pageRefs.add(this.#targetFromCtx(ctx))
        }
        if (ctx.line) ctx.line.forEach(line => this.visit(line))
    }
}
