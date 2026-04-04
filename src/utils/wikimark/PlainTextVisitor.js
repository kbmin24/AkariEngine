import { WikiParser } from './wikiparser.js'
import { orphanableTokens } from './lexer.js'

const parserInstance = new WikiParser()
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructorWithDefaults()

/**
 * Visitor that produces plain text for full-text search indexing.
 * Does not require preprocessing (no manifest). Skips macros, TOC, footnotes, and fenced code.
 */
export class PlainTextVisitor extends BaseCstVisitor {
    constructor() {
        super()
        this.validateVisitor()
    }

    document(ctx) {
        if (!ctx.block) return ''
        return ctx.block
            .map(block => this.visit(block))
            .filter(s => s)
            .join('\n\n')
            .trim()
    }

    block(ctx) {
        if (ctx.heading) return this.visit(ctx.heading[0])
        if (ctx.leftalign) return this.visit(ctx.leftalign[0])
        if (ctx.centeralign) return this.visit(ctx.centeralign[0])
        if (ctx.rightalign) return this.visit(ctx.rightalign[0])
        if (ctx.TOCBox) return ''
        if (ctx.footnoteList) return ''
        if (ctx.blockquote) return this.visit(ctx.blockquote[0])
        if (ctx.unorderedList) return this.visit(ctx.unorderedList[0])
        if (ctx.orderedList) return this.visit(ctx.orderedList[0])
        if (ctx.fencedCode) return ''
        if (ctx.multilineMacro) return ''
        if (ctx.table) return this.visit(ctx.table[0])
        if (ctx.FencedCode) return ''
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
        return ''
    }

    #headingInner(ctx) {
        return ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
    }

    h1(ctx) { return this.#headingInner(ctx) }
    h2(ctx) { return this.#headingInner(ctx) }
    h3(ctx) { return this.#headingInner(ctx) }
    h4(ctx) { return this.#headingInner(ctx) }
    h5(ctx) { return this.#headingInner(ctx) }
    h6(ctx) { return this.#headingInner(ctx) }

    leftalign(ctx) {
        return ctx.block ? ctx.block.map(b => this.visit(b)).filter(s => s).join('\n') : ''
    }

    centeralign(ctx) {
        return ctx.block ? ctx.block.map(b => this.visit(b)).filter(s => s).join('\n') : ''
    }

    rightalign(ctx) {
        return ctx.block ? ctx.block.map(b => this.visit(b)).filter(s => s).join('\n') : ''
    }

    table(ctx) {
        if (!ctx.tableRow) return ''
        return ctx.tableRow.map(row => this.visit(row)).filter(s => s).join('\n')
    }

    tableRow(ctx) {
        if (!ctx.line) return ''
        return ctx.line.map(line => this.visit(line)).filter(s => s).join(' ')
    }

    paragraph(ctx) {
        return ctx.line.map(line => this.visit(line)).join(' ')
    }

    line(ctx) {
        if (!ctx.inline) return ''
        return ctx.inline.map(inline => this.visit(inline)).join('')
    }

    inline(ctx) {
        if (ctx.Macro) return ''
        if (ctx.templateArg) return this.visit(ctx.templateArg[0])
        if (ctx.bold) return this.visit(ctx.bold[0])
        if (ctx.italic) return this.visit(ctx.italic[0])
        if (ctx.underline) return this.visit(ctx.underline[0])
        if (ctx.strikethru) return this.visit(ctx.strikethru[0])
        if (ctx.superscript) return this.visit(ctx.superscript[0])
        if (ctx.subscript) return this.visit(ctx.subscript[0])
        if (ctx.big) return this.visit(ctx.big[0])
        if (ctx.anonymousFootnote) return ''
        if (ctx.anonymousFootnoteFallback) return ''
        if (ctx.simpleLink) return this.visit(ctx.simpleLink[0])
        if (ctx.namedLink) return this.visit(ctx.namedLink[0])
        if (ctx.SpaceTab) return ctx.SpaceTab[0].image
        if (ctx.Text) return ctx.Text[0].image
        if (ctx.EscapeChar) return ctx.EscapeChar[0].image[1]
        if (ctx.DisplayMath) return ctx.DisplayMath[0].payload.content
        if (ctx.InlineMath) return ctx.InlineMath[0].payload.content

        // orphaned tokens — render as their literal characters
        for (const tokenName of orphanableTokens) {
            if (ctx[tokenName]) return ctx[tokenName][0].image
        }

        return ''
    }

    #visitInlines(ctx) {
        return ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
    }

    bold(ctx) { return this.#visitInlines(ctx) }
    italic(ctx) { return this.#visitInlines(ctx) }
    underline(ctx) { return this.#visitInlines(ctx) }
    strikethru(ctx) { return this.#visitInlines(ctx) }
    superscript(ctx) { return this.#visitInlines(ctx) }
    subscript(ctx) { return this.#visitInlines(ctx) }
    big(ctx) { return this.#visitInlines(ctx) }

    blockquote(ctx) {
        return (ctx.blockquoteItem ?? []).map(item => this.visit(item)).filter(s => s).join('\n')
    }

    blockquoteItem(ctx) {
        return ctx.line ? this.visit(ctx.line[0]) : ''
    }

    unorderedList(ctx) {
        return (ctx.unorderedListItem ?? []).map(item => this.visit(item)).filter(s => s).join('\n')
    }

    unorderedListItem(ctx) {
        return ctx.line ? this.visit(ctx.line[0]) : ''
    }

    orderedList(ctx) {
        return (ctx.orderedListItem ?? []).map(item => this.visit(item)).filter(s => s).join('\n')
    }

    orderedListItem(ctx) {
        return ctx.line ? this.visit(ctx.line[0]) : ''
    }

    #targetFromCtx(ctx) {
        return (ctx.linkTargetToken ?? [])
            .map(node => Object.values(node.children)[0][0].image)
            .join('')
    }

    simpleLink(ctx) {
        return this.#targetFromCtx(ctx)
    }

    namedLink(ctx) {
        return ctx.line ? this.visit(ctx.line[0]) : this.#targetFromCtx(ctx)
    }

    templateArg(ctx) {
        return ctx.line ? this.#rawText(ctx.line[0]) : ''
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
