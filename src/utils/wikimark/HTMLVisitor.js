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
     */
    constructor(manifest) {
        super()
        this.validateVisitor()
        this.headingCounts = [0, 0, 0, 0, 0, 0]
        this.manifest = manifest
    }

    document(ctx) {
        // reinit'ise heading number counter
        this.headingCounts = [0, 0, 0, 0, 0, 0]

        return ctx.block.map(block => this.visit(block)).join('')
    }

    block(ctx) {
        if (ctx.heading) return this.visit(ctx.heading[0])
        if (ctx.leftalign) return this.visit(ctx.leftalign[0])
        if (ctx.centeralign) return this.visit(ctx.centeralign[0])
        if (ctx.rightalign) return this.visit(ctx.rightalign[0])
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
        const inner = ctx.inline ? ctx.inline.map(i => this.visit(i)).join('') : ''
        return `<h${depth}>${headingName} ${inner.trim()}</h${depth}>`
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
        if (ctx.superscript) return this.visit(ctx.superscript[0])
        if (ctx.subscript) return this.visit(ctx.subscript[0])
        if (ctx.big) return this.visit(ctx.big[0])
        if (ctx.Text) return ctx.Text[0].image
        if (ctx.EscapeChar) return ctx.EscapeChar[0].image[1]

        // unmatched delimiters — render as their literal characters
        if (ctx.LeftAlignOpen) return ctx.LeftAlignOpen[0].image
        if (ctx.CenterAlignOpen) return ctx.CenterAlignOpen[0].image
        if (ctx.RightAlignOpen) return ctx.RightAlignOpen[0].image
        if (ctx.MultilineClose) return ctx.MultilineClose[0].image
        if (ctx.BoldDelim) return ctx.BoldDelim[0].image
        if (ctx.ItalicDelim) return ctx.ItalicDelim[0].image
        if (ctx.UnderlineDelim) return ctx.UnderlineDelim[0].image
        if (ctx.SupDelim) return ctx.SupDelim[0].image
        if (ctx.SubDelim) return ctx.SubDelim[0].image
        if (ctx.BigDelim) return ctx.BigDelim[0].image
        if (ctx.h1Open) return ctx.h1Open[0].image
        if (ctx.h1Close) return ctx.h1Close[0].image
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
