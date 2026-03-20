import { CstParser, EOF } from "chevrotain"
import { allTokens, T, inlineTokens } from "./tokens.js"
import { scanTokenMatches } from "./scanTokenMatches.js"

export class WikiParser extends CstParser {
    constructor() {
        super(allTokens, { maxLookahead: 1 })

        const $ = this

        $.openers = new Set()
        $.closers = new Set()
        $.matchedHeadingOpens = new Set()

        // helpers to match unmatched ones
        const isOpener = (type) => () => $.openers.has($.LA(1)) && $.LA(1).tokenType === type
        const isNotOpener = (type) => () => !isOpener(type)()
        const isNotCloser = () => !$.closers.has($.LA(1))


        $.RULE('document', () => {
            $.MANY({
                GATE: () => $.LA(1).tokenTypeIdx !== EOF.tokenTypeIdx,
                DEF: () => $.SUBRULE($.block)
            })
        })

        $.RULE('block', () => {
            $.OR([
                { GATE: () => $.matchedHeadingOpens.has($.LA(1)), ALT: () => $.SUBRULE($.heading) },
                { ALT: () => $.SUBRULE($.leftalign) },
                { ALT: () => $.SUBRULE($.centeralign) },
                { ALT: () => $.SUBRULE($.rightalign) },
                { ALT: () => $.SUBRULE($.TOCBox) },
                { ALT: () => $.SUBRULE($.footnoteList) },
                // bare LF tokens (blank lines between/around blocks)
                { ALT: () => $.CONSUME2(T.LF) },
                { ALT: () => $.SUBRULE($.paragraph) },
            ])
        })

        // headings
        for (let n = 1; n <= 6; n++) {
            $.RULE(`h${n}`, () => {
                $.CONSUME(T[`H${n}Open`])
                $.MANY({
                    GATE: () => $.LA(1).tokenType !== T[`H${n}Close`],
                    DEF: () => $.SUBRULE($.inline)
                })
                $.CONSUME(T[`H${n}Close`])
                $.OPTION(() => $.CONSUME(T.LF))
            })
        }

        $.RULE('heading', () => {
            $.OR([
                { ALT: () => $.SUBRULE($.h6) },
                { ALT: () => $.SUBRULE($.h5) },
                { ALT: () => $.SUBRULE($.h4) },
                { ALT: () => $.SUBRULE($.h3) },
                { ALT: () => $.SUBRULE($.h2) },
                { ALT: () => $.SUBRULE($.h1) },
            ])
        })

        $.RULE('leftalign', () => {
            $.CONSUME(T.LeftAlignOpen)
            $.OPTION(() => { $.CONSUME(T.LF) })
            $.MANY1({
                // determine if (LF)Close (shouldn't be the case)
                GATE: () => $.LA(1).tokenType !== T.MultilineClose
                    && !($.LA(1).tokenType === T.LF && $.LA(2).tokenType === T.MultilineClose),
                // recursively allow nested align or other rules...
                DEF: () => $.SUBRULE($.block)
            })
            $.OPTION1(() => { $.CONSUME1(T.LF) })
            $.CONSUME(T.MultilineClose)
        })

        $.RULE('centeralign', () => {
            $.CONSUME(T.CenterAlignOpen)
            $.OPTION(() => { $.CONSUME(T.LF) })
            $.MANY1({
                GATE: () => $.LA(1).tokenType !== T.MultilineClose
                    && !($.LA(1).tokenType === T.LF && $.LA(2).tokenType === T.MultilineClose),
                DEF: () => $.SUBRULE($.block)
            })
            $.OPTION1(() => { $.CONSUME1(T.LF) })
            $.CONSUME(T.MultilineClose)
        })

        $.RULE('rightalign', () => {
            $.CONSUME(T.RightAlignOpen)
            $.OPTION(() => { $.CONSUME(T.LF) })
            $.MANY1({
                GATE: () => $.LA(1).tokenType !== T.MultilineClose
                    && !($.LA(1).tokenType === T.LF && $.LA(2).tokenType === T.MultilineClose),
                DEF: () => $.SUBRULE($.block)
            })
            $.OPTION1(() => { $.CONSUME1(T.LF) })
            $.CONSUME(T.MultilineClose)
        })

        $.RULE('TOCBox', () => {
            $.CONSUME(T.TOC)
        })

        $.RULE('footnoteList', () => {
            $.CONSUME(T.Footnote)
        })

        $.RULE('paragraph', () => {
            $.SUBRULE($.line)
            $.MANY({
                // only proceed if next line starts with inline content (not a block-level construct or blank line)
                GATE: () => {
                    if ($.LA(1).tokenType !== T.LF) return false
                    const la2 = $.LA(2).tokenType
                    return inlineTokens.has(la2)
                        && $.LA(2).tokenTypeIdx !== EOF.tokenTypeIdx
                },
                DEF: () => {
                    $.CONSUME(T.LF)
                    $.SUBRULE1($.line)
                }
            })
        })

        $.RULE('line', () => {
            $.AT_LEAST_ONE({
                GATE: () => !$.closers.has($.LA(1)),
                DEF: () => $.SUBRULE($.inline)
            })
        })

        $.RULE('inline', () => {
            $.OR([
                // identify if this is a matched opener
                { GATE: isOpener(T.BoldItalicDelim), ALT: () => $.SUBRULE($.boldItalic) },
                { GATE: isOpener(T.BoldDelim), ALT: () => $.SUBRULE($.bold) },
                { GATE: isOpener(T.ItalicDelim), ALT: () => $.SUBRULE($.italic) },
                { GATE: isOpener(T.UnderlineDelim), ALT: () => $.SUBRULE($.underline) },
                { GATE: isOpener(T.StrikeDelim), ALT: () => $.SUBRULE($.strikethru) },
                { GATE: isOpener(T.SupDelim), ALT: () => $.SUBRULE($.superscript) },
                { GATE: isOpener(T.SubDelim), ALT: () => $.SUBRULE($.subscript) },
                { GATE: isOpener(T.BigDelim), ALT: () => $.SUBRULE($.big) },
                { GATE: () => {
                    return isOpener(T.FootnoteOpener) &&
                    $.LA(2).tokenType === T.SpaceTab
                }, ALT: () => $.SUBRULE($.anonymousFootnote) },
                { GATE: isOpener(T.FootnoteOpener), ALT: () => $.SUBRULE($.anonymousFootnoteFallback) },
                { ALT: () => $.CONSUME(T.SpaceTab) },
                { ALT: () => $.CONSUME(T.Text) },
                { ALT: () => $.CONSUME(T.EscapeChar) },
                ...[1, 2, 3, 4, 5, 6].map(n => ({ ALT: () => $.CONSUME(T[`H${n}Open`]) })),
                ...[1, 2, 3, 4, 5, 6].map(n => ({ ALT: () => $.CONSUME(T[`H${n}Close`]) })),

                // closer needs to be consumed elseware; prevent it from being consumed here.
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.MacroCloser) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.BoldItalicDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.BoldDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.ItalicDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.UnderlineDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.SupDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.SubDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.BigDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.StrikeDelim) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.MultilineClose) },

                // consumed orphaned footnoteOpener
                { GATE: isNotOpener(T.FootnoteOpener), ALT: () => $.CONSUME(T.FootnoteOpener) }
            ])
        })

        $.RULE('boldItalic', () => {
            $.CONSUME(T.BoldItalicDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.BoldItalicDelim)
        })

        $.RULE('bold', () => {
            $.CONSUME(T.BoldDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.BoldDelim)
        })

        $.RULE('italic', () => {
            $.CONSUME(T.ItalicDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.ItalicDelim)
        })

        $.RULE('underline', () => {
            $.CONSUME(T.UnderlineDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.UnderlineDelim)
        })

        $.RULE('strikethru', () => {
            $.CONSUME(T.StrikeDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.StrikeDelim)
        })

        $.RULE('superscript', () => {
            $.CONSUME(T.SupDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.SupDelim)
        })

        $.RULE('subscript', () => {
            $.CONSUME(T.SubDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.SubDelim)
        })

        $.RULE('big', () => {
            $.CONSUME(T.BigDelim)
            $.MANY({ GATE: isNotCloser, DEF: () => $.SUBRULE($.inline) })
            $.CONSUME1(T.BigDelim)
        })

        // footnote without identifier
        $.RULE('anonymousFootnote', () => {
            $.CONSUME(T.FootnoteOpener)
            $.CONSUME(T.SpaceTab)
            $.SUBRULE($.line) //contents
            $.CONSUME(T.MacroCloser)
        })

        $.RULE('anonymousFootnoteFallback', () => {
            $.CONSUME(T.FootnoteOpener)
            $.SUBRULE($.line) //contents
            $.CONSUME(T.MacroCloser)
        })

        $.performSelfAnalysis()
    }

    parse(tokens) {
        // call this instead of the standard pattern
        const { openers, closers, matchedHeadingOpens } = scanTokenMatches(tokens)
        this.openers = openers
        this.closers = closers
        this.matchedHeadingOpens = matchedHeadingOpens
        this.input = tokens
        return this.document()
    }
}
