import { createToken, Lexer } from "chevrotain"
import { create } from "svg-captcha"

// we need four slashes to bc it is escaped twice...
const BSLASH = '\\\\'

const SPECIAL_CHARS = `_'^,"/[(){}:=\\-${BSLASH}\\*#\\r\\n`

const EscapeChar = createToken({
    name: 'EscapeChar',
    pattern: new RegExp(`\\\\[${SPECIAL_CHARS}]`),
})

const LeftAlignOpen = createToken({
    name: 'LeftAlignOpen',
    pattern: /\[\(\]{{/,
})

const CenterAlignOpen = createToken({
    name: 'CenterAlignOpen',
    pattern: /\[:\]{{/,
})

const RightAlignOpen = createToken({
    name: 'RightAlignOpen',
    pattern: /\[\)\]{{/,
})

/*
perhaps not the best name, but is used for
multiline macro and align tags
*/
const MultilineClose = createToken({
    name: 'MultilineClose',
    pattern: /}}/,
})

const UnderlineDelim = createToken({
    name: 'UnderlineDelim',
    pattern: /__/,
})

/* ideally we the parser should be able to handle them in one chunk
but that seems to be quite tricky */
const BoldItalicDelim = createToken({
    name: 'BoldItalicDelim',
    pattern: /'''''/,
})

const BoldDelim = createToken({
    name: 'BoldDelim',
    pattern: /'''/,
})

const ItalicDelim = createToken({
    name: 'ItalicDelim',
    pattern: /''/,
})

const StrikeDelim = createToken({
    name: 'StrikeDelim',
    pattern: /--/,
})

const SupDelim = createToken({
    name: 'SupDelim',
    pattern: /\^\^/,
})

const SubDelim = createToken({
    name: 'SubDelim',
    pattern: /,,/,
})

const BigDelim = createToken({
    name: 'BigDelim',
    pattern: /"""/,
})

const TOC = createToken({
    name: 'TOC',
    pattern: /\[(toc|목차)\]/i,
})

const Footnote = createToken({
    name: 'Footnote',
    pattern: /\[(footnote|각주)\]/i,
})

const FootnoteOpener = createToken({
    name: 'FootnoteOpener',
    pattern: /\[\*/
})

const MacroCloser = createToken({
    name: 'MacroCloser',
    pattern: /\]/
})

const CR = createToken({
    name: 'CR',
    pattern: /\r/,
    line_breaks: true,
    group: Lexer.SKIPPED
})

const LF = createToken({
    name: 'LF',
    pattern: /\n/,
    line_breaks: true,
})

const commentPattern = /\/\/[^\n]*\n?/y

const Comment = createToken({
    name: 'Comment',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        commentPattern.lastIndex = offset
        return commentPattern.exec(text)
    },
    line_breaks: true,
    group: Lexer.SKIPPED,
})

// generate tokens for h1-6
// going backwards since going forwards would cause greedy matching issues
const headingTokens = {}
for (let n = 6; n >= 1; n--) {
    const eqStr = '='.repeat(n)
    const openPat = new RegExp(eqStr + ' ', 'y')
    const closePat = new RegExp(` ${eqStr}[ \\t]*(?=\\n|\\r|$)`, 'y')
    headingTokens[`H${n}Open`] = createToken({
        name: `H${n}Open`,
        pattern: (text, offset) => {
            if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
            openPat.lastIndex = offset
            return openPat.exec(text)
        },
        line_breaks: false,
    })
    headingTokens[`H${n}Close`] = createToken({
        name: `H${n}Close`,
        pattern: (text, offset) => {
            closePat.lastIndex = offset
            return closePat.exec(text)
        },
        line_breaks: false,
    })
}
const listBulletPattern = /\*+(?= \S)/y
const ULBullet = createToken({
    name: 'ULBullet',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        listBulletPattern.lastIndex = offset
        return listBulletPattern.exec(text)
    },
    line_breaks: false,
})

const olBulletPattern = /#+(?= \S)/y
const OLBullet = createToken({
    name: 'OLBullet',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        olBulletPattern.lastIndex = offset
        return olBulletPattern.exec(text)
    },
    line_breaks: false,
})

const SpaceTab = createToken({
    name: 'SpaceTab',
    pattern: /( |\t)/,
})

/*
we want to match everything thats not a space
while keeping all special chars separate
Does NOT include whitespace
*/
const Text = createToken({
    name: 'Text',
    pattern: new RegExp(`[^${SPECIAL_CHARS} \t\\]]+|[${SPECIAL_CHARS}]`),
    line_breaks: true,
})

export const T = {
    EscapeChar,
    LeftAlignOpen,
    CenterAlignOpen,
    RightAlignOpen,
    MultilineClose,
    UnderlineDelim,
    BoldItalicDelim,
    BoldDelim,
    ItalicDelim,
    StrikeDelim,
    SupDelim,
    SubDelim,
    BigDelim,
    Footnote,
    FootnoteOpener,
    MacroCloser,
    TOC,
    CR,
    LF,
    Comment,
    ...headingTokens,
    ULBullet,
    OLBullet,
    SpaceTab,
    Text
}

export const allTokens = Object.values(T)

export const inlineTokens = new Set([
    EscapeChar,
    UnderlineDelim,
    BoldDelim,
    BoldItalicDelim,
    ItalicDelim,
    StrikeDelim,
    SupDelim,
    SubDelim,
    BigDelim,
    FootnoteOpener,
    MacroCloser,
    SpaceTab,
    Text])

export const symmetricTokens = new Set([
    UnderlineDelim,
    BoldItalicDelim,
    BoldDelim,
    ItalicDelim,
    StrikeDelim,
    SupDelim,
    SubDelim,
    BigDelim
])

/**
 * Tokens that require matching pairs, but are asymmetric.
 */
export const assymetricTokens = [
    [FootnoteOpener, MacroCloser],
    [LeftAlignOpen, MultilineClose],
    [CenterAlignOpen, MultilineClose],
    [RightAlignOpen, MultilineClose]
]

// quick lookup
export const assymetricOpeners = new Set(assymetricTokens.map(pair => pair[0]))
export const assymetricClosers = new Set(assymetricTokens.map(pair => pair[1]))

// align openers only appear at block position (start of line); never valid inline
export const blockLevelOpeners = new Set([LeftAlignOpen, CenterAlignOpen, RightAlignOpen])

export function areMatchingAsymTokens(opener, closer) {
    for (const [openTok, closeTok] of assymetricTokens) {
        if (opener.tokenType === openTok && closer.tokenType === closeTok) {
            return true
        }
    }
    return false
}