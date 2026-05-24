import { CstParser, EOF } from "chevrotain"
import { allTokens, T, inlineTokens } from "./tokens.js"
import { scanTokenMatches } from "./scanTokenMatches.js"

// tokens that terminate a link target; everything else is consumed as literal text
const linkTargetStopTypes = new Set([T.Pipe, T.LinkClose, T.LF, T.CR, T.Comment])

const hasLinkPipe = ($) => () => {
    let i = 2 // start after LinkOpen
    while (true) {
        const tok = $.LA(i)
        if (tok.tokenType === T.LinkClose || tok.tokenType === T.LF || tok.tokenTypeIdx === EOF.tokenTypeIdx) return false
        if (tok.tokenType === T.Pipe) return true
        i++
    }
}

export class WikiParser extends CstParser {
    constructor() {
        super(allTokens, { maxLookahead: 1 })

        const $ = this

        $.openers = new Set()
        $.closers = new Set()
        $.matchedHeadingOpens = new Set()
        $.matchedFenceOpens = new Set()

        // helpers to match unmatched ones
        const isOpener = (type) => () => $.openers.has($.LA(1)) && $.LA(1).tokenType === type
        const isNotOpener = (type) => () => !isOpener(type)()
        const isNotCloser = () => !$.closers.has($.LA(1))
        const isValidTableDelim = () => $.validTableDelims.has($.LA(1))


        $.RULE('document', () => {
            $.MANY({
                GATE: () => $.LA(1).tokenTypeIdx !== EOF.tokenTypeIdx,
                DEF: () => $.SUBRULE($.block)
            })
        })

        $.RULE('block', () => {
            $.OR([
                { GATE: () => $.matchedHeadingOpens.has($.LA(1)), ALT: () => $.SUBRULE($.heading) },
                { GATE: () => $.LA(1).tokenType === T.LeftAlignOpen, ALT: () => $.SUBRULE($.leftalign) },
                { GATE: () => $.LA(1).tokenType === T.CenterAlignOpen, ALT: () => $.SUBRULE($.centeralign) },
                { GATE: () => $.LA(1).tokenType === T.RightAlignOpen, ALT: () => $.SUBRULE($.rightalign) },
                { GATE: () => $.LA(1).tokenType === T.TOC, ALT: () => $.SUBRULE($.TOCBox) },
                { GATE: () => $.LA(1).tokenType === T.Footnote, ALT: () => $.SUBRULE($.footnoteList) },
                { GATE: () => $.LA(1).tokenType === T.BQBullet, ALT: () => $.SUBRULE($.blockquote) },
                { GATE: () => $.LA(1).tokenType === T.ULBullet, ALT: () => $.SUBRULE($.unorderedList) },
                { GATE: () => $.LA(1).tokenType === T.OLBullet, ALT: () => $.SUBRULE($.orderedList) },
                { GATE: () => $.matchedFenceOpens.has($.LA(1)), ALT: () => $.SUBRULE($.fencedCode) },
                { GATE: () => $.LA(1).tokenType === T.MultilineMacro, ALT: () => $.SUBRULE($.multilineMacro) },
                { GATE: isValidTableDelim, ALT: () => $.SUBRULE($.table) },

                // bare LF tokens (blank lines between/around blocks)
                { ALT: () => $.CONSUME2(T.LF) },
                // orphaned (unmatched) FencedCode token — render as literal
                { GATE: () => $.LA(1).tokenType === T.FencedCode, ALT: () => $.CONSUME(T.FencedCode) },
                { ALT: () => $.SUBRULE($.paragraph) },
            ])
        })

        $.RULE('table', () => {
            $.AT_LEAST_ONE({ GATE: isValidTableDelim, DEF: () => $.SUBRULE($.tableRow) })
        })

        $.RULE('tableRow', () => {
            $.CONSUME(T.TableDelimStart)
            $.SUBRULE($.line)
            $.MANY({
                // Continue only when the next || is a valid interior separator,
                // i.e. something follows it before LF/EOF (that would be the closer).
                GATE: () => {
                    const la2 = $.LA(2)
                    return isValidTableDelim()
                        && la2.tokenTypeIdx !== EOF.tokenTypeIdx
                        && la2.tokenType !== T.LF
                },
                DEF: () => {
                    $.CONSUME(T.TableDelim)
                    $.SUBRULE1($.line)
                }
            })
            $.CONSUME1(T.TableDelim)
            $.OPTION(() => {
                $.CONSUME(T.LF)
            })
        })

        $.RULE('fencedCode', () => {
            $.CONSUME(T.FencedCode)
            $.MANY({
                GATE: () => $.LA(1).tokenType !== T.FencedCode
                    && $.LA(1).tokenTypeIdx !== EOF.tokenTypeIdx,
                DEF: () => $.SUBRULE($.block)
            })
            $.CONSUME1(T.FencedCode)
        })

        $.RULE('multilineMacro', () => {
            $.CONSUME(T.MultilineMacro)
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

        $.RULE('blockquote', () => {
            $.AT_LEAST_ONE(() => $.SUBRULE($.blockquoteItem))
        })

        $.RULE('blockquoteItem', () => {
            $.CONSUME(T.BQBullet)
            $.OPTION(() => $.CONSUME(T.SpaceTab))
            $.SUBRULE($.line)
            $.OPTION1(() => $.CONSUME(T.LF))
        })

        $.RULE('unorderedList', () => {
            $.AT_LEAST_ONE(() => $.SUBRULE($.unorderedListItem))
        })

        $.RULE('unorderedListItem', () => {
            $.CONSUME(T.ULBullet)
            $.CONSUME(T.SpaceTab)
            $.SUBRULE($.line)
            $.OPTION(() => $.CONSUME(T.LF))
        })

        $.RULE('orderedList', () => {
            $.AT_LEAST_ONE(() => $.SUBRULE($.orderedListItem))
        })

        $.RULE('orderedListItem', () => {
            $.CONSUME(T.OLBullet)
            $.CONSUME(T.SpaceTab)
            $.SUBRULE($.line)
            $.OPTION(() => $.CONSUME(T.LF))
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
                GATE: () => !$.closers.has($.LA(1)) && !isValidTableDelim(),
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
                {
                    GATE: () => {
                        return isOpener(T.FootnoteOpener) &&
                            $.LA(2).tokenType === T.SpaceTab
                    }, ALT: () => $.SUBRULE($.anonymousFootnote)
                },
                { GATE: isOpener(T.FootnoteOpener), ALT: () => $.SUBRULE($.anonymousFootnoteFallback) },
                { GATE: () => isOpener(T.LinkOpen)() && hasLinkPipe($)(), ALT: () => $.SUBRULE($.namedLink) },
                { GATE: isOpener(T.LinkOpen), ALT: () => $.SUBRULE($.simpleLink) },
                { GATE: isOpener(T.TemplateArgOpen), ALT: () => $.SUBRULE($.templateArg) },
                { ALT: () => $.CONSUME(T.Macro) },
                { ALT: () => $.CONSUME(T.DisplayMath) },
                { ALT: () => $.CONSUME(T.InlineMath) },
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
                { GATE: isNotOpener(T.FootnoteOpener), ALT: () => $.CONSUME(T.FootnoteOpener) },

                // orphaned template arg tokens
                { GATE: isNotOpener(T.TemplateArgOpen), ALT: () => $.CONSUME(T.TemplateArgOpen) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.TemplateArgClose) },

                // orphaned link tokens
                { GATE: isNotOpener(T.LinkOpen), ALT: () => $.CONSUME(T.LinkOpen) },
                { GATE: isNotCloser, ALT: () => $.CONSUME(T.LinkClose) },
                { ALT: () => $.CONSUME(T.Pipe) },

                // orphaned table delims
                { GATE: () => !isValidTableDelim(), ALT: () => $.CONSUME(T.TableDelim) },
                { GATE: () => !isValidTableDelim(), ALT: () => $.CONSUME(T.TableDelimStart) },

                /*
                consume tokens for block-level consturcts
                obviously they shouldn't be here but they might appear in case of malicious inputs
                */
                { ALT: () => $.CONSUME(T.LeftAlignOpen) },
                { ALT: () => $.CONSUME(T.CenterAlignOpen) },
                { ALT: () => $.CONSUME(T.RightAlignOpen) },
                { ALT: () => $.CONSUME(T.TOC) },
                { ALT: () => $.CONSUME(T.Footnote) },
            ])
        })

        // consumes any single token valid inside a link target (everything except stop tokens)
        $.RULE('linkTargetToken', () => {
            $.OR(
                Object.values(T)
                    .filter(tok => !linkTargetStopTypes.has(tok))
                    .map(tok => ({ ALT: () => $.CONSUME(tok) }))
            )
        })

        $.RULE('simpleLink', () => {
            $.CONSUME(T.LinkOpen)
            $.MANY({
                GATE: () => $.LA(1).tokenType !== T.LinkClose && $.LA(1).tokenType !== T.LF,
                DEF: () => $.SUBRULE($.linkTargetToken)
            })
            $.CONSUME(T.LinkClose)
        })

        $.RULE('namedLink', () => {
            $.CONSUME(T.LinkOpen)
            $.MANY({
                GATE: () => $.LA(1).tokenType !== T.Pipe && $.LA(1).tokenType !== T.LF,
                DEF: () => $.SUBRULE($.linkTargetToken)
            })
            $.CONSUME(T.Pipe)
            // line already stops at closers; ]] will be in $.closers when properly matched
            $.SUBRULE($.line)
            $.CONSUME(T.LinkClose)
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

        $.RULE('templateArg', () => {
            $.CONSUME(T.TemplateArgOpen)
            $.SUBRULE($.line)
            $.CONSUME(T.TemplateArgClose)
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
        const { openers, closers, matchedHeadingOpens, matchedFenceOpens, validTableDelims } = scanTokenMatches(tokens)
        this.openers = openers
        this.closers = closers
        this.matchedHeadingOpens = matchedHeadingOpens
        this.matchedFenceOpens = matchedFenceOpens
        this.validTableDelims = validTableDelims
        this.input = tokens
        return this.document()
    }
}
