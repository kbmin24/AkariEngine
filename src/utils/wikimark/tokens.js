import { createToken, Lexer } from "chevrotain"

// we need four slashes to bc it is escaped twice...
const BSLASH = '\\\\'

const SPECIAL_CHARS = `_'^,"/[\\](){}:=\\-${BSLASH}\\*#\\r\\n|>`

const EscapeChar = createToken({
    name: 'EscapeChar',
    pattern: new RegExp(`\\\\.`),
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

const TemplateArgOpen = createToken({
    name: 'TemplateArgOpen',
    pattern: /\{\{\{/,
})

const TemplateArgClose = createToken({
    name: 'TemplateArgClose',
    pattern: /\}\}\}(?!\})/,
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

const LinkOpen = createToken({
    name: 'LinkOpen',
    pattern: /\[\[/,
})

const LinkClose = createToken({
    name: 'LinkClose',
    pattern: /\]\]/,
})

const Pipe = createToken({
    name: 'Pipe',
    pattern: /\|/,
})

const FootnoteOpener = createToken({
    name: 'FootnoteOpener',
    pattern: /\[\*/
})

const DisplayMathPattern = /\$\$((?:[^$\\]|\\.|\\\n)+)\$\$/y
const DisplayMath = createToken({
    name: 'DisplayMath',
    pattern: (text, offset) => {
        DisplayMathPattern.lastIndex = offset
        const match = DisplayMathPattern.exec(text)
        if (!match) return null
        match.payload = { content: match[1] }
        return match
    },
    line_breaks: false,
})

const inlineMathPattern = /\$((?:[^$\\]|\\.|\\\n)+)\$/y
const InlineMath = createToken({
    name: 'InlineMath',
    pattern: (text, offset) => {
        inlineMathPattern.lastIndex = offset
        const match = inlineMathPattern.exec(text)
        if (!match) return null
        match.payload = { content: match[1] }
        return match
    },
    line_breaks: false,
})

const macroPattern = /\[([A-Za-z][A-Za-z0-9_-]*)(?:\(((?:[^)\\]|\\.)*)\))?\]/y
const Macro = createToken({
    name: 'Macro',
    pattern: (text, offset) => {
        macroPattern.lastIndex = offset
        const match = macroPattern.exec(text)
        if (!match) return null
        match.payload = {
            name: match[1],
            option: match[2] ?? null,
        }
        return match
    },
    line_breaks: false,
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

const Category = createToken({
    name: 'Category',
    pattern:/\[\[(?:Category|분류):(.*?)\]\]/i,
    group: Lexer.SKIPPED
})

const multilineMacroPattern = /\[([A-Za-z][A-Za-z0-9_-]*)\]\{\{([\s\S]*?)\}\}/y
const MultilineMacro = createToken({
    name: 'MultilineMacro',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        multilineMacroPattern.lastIndex = offset
        const match = multilineMacroPattern.exec(text)
        if (!match) return null
        match.payload = {
            name: match[1],
            content: match[2],
        }
        return match
    },
    line_breaks: true,
})

const fencedCodePattern = /```[ \t]*(?:\n|$)/y
const FencedCode = createToken({
    name: 'FencedCode',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        fencedCodePattern.lastIndex = offset
        return fencedCodePattern.exec(text)
    },
    line_breaks: true,
})

const optionsFrontmatterPattern = /(?:Option \w+ \w+\r?\n)+/iy
const OptionsFrontmatter = createToken({
    name: 'OptionsFrontmatter',
    pattern: (text, offset) => {
        if (offset !== 0) return null
        optionsFrontmatterPattern.lastIndex = 0
        return optionsFrontmatterPattern.exec(text)
    },
    line_breaks: true,
    group: Lexer.SKIPPED,
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

// matches || followed by string consisted only [...], allowing preceding whitespacetax
const macros = ["include", "hr", "br", "file", "color", "youtube", "anchor", "dday", "agek", "age", "map", "pagecount", "syntax"]
const TableDelimPattern = new RegExp(`\\|\\|((?:(?:\\t| )*\\[(?!${macros.join('|')})[^\\r\\n]*?\\])*)?`, 'y')

// TableDelim at start of line
const TableDelimStart = createToken({
    name: 'TableDelimStart',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        TableDelimPattern.lastIndex = offset
        const match = TableDelimPattern.exec(text)
        if (!match) return null
        match.payload = { options: match[1] ?? '' }
        return match
    },
    line_breaks: true,
})

const TableDelim = createToken({
    name: 'TableDelim',
    pattern: (text, offset) => {
        if (offset === 0 || text[offset - 1] === '\n' || text[offset - 1] === '\r') return null
        TableDelimPattern.lastIndex = offset
        const match = TableDelimPattern.exec(text)
        if (!match) return null
        match.payload = { options: match[1] ?? '' }
        return match
    },
    line_breaks: true,
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
const bqBulletPattern = />+(?=\S)/y
const BQBullet = createToken({
    name: 'BQBullet',
    pattern: (text, offset) => {
        if (offset !== 0 && text[offset - 1] !== '\n' && text[offset - 1] !== '\r') return null
        bqBulletPattern.lastIndex = offset
        return bqBulletPattern.exec(text)
    },
    line_breaks: false,
})

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
    OptionsFrontmatter,
    MultilineMacro,
    FencedCode,
    DisplayMath,
    InlineMath,
    EscapeChar,
    LeftAlignOpen,
    CenterAlignOpen,
    RightAlignOpen,
    TemplateArgOpen,
    TemplateArgClose,
    MultilineClose,
    TableDelimStart,
    TableDelim,
    UnderlineDelim,
    BoldItalicDelim,
    BoldDelim,
    ItalicDelim,
    StrikeDelim,
    SupDelim,
    SubDelim,
    BigDelim,
    Category,
    LinkOpen,
    LinkClose,
    Pipe,
    Footnote,
    FootnoteOpener,
    MacroCloser,
    TOC,
    Macro,
    CR,
    LF,
    Comment,
    ...headingTokens,
    BQBullet,
    ULBullet,
    OLBullet,
    SpaceTab,
    Text
}

export const allTokens = Object.values(T)

export const inlineTokens = new Set([
    DisplayMath,
    InlineMath,
    EscapeChar,
    UnderlineDelim,
    BoldDelim,
    BoldItalicDelim,
    ItalicDelim,
    StrikeDelim,
    SupDelim,
    SubDelim,
    BigDelim,
    LinkOpen,
    LinkClose,
    Pipe,
    FootnoteOpener,
    Macro,
    MacroCloser,
    TemplateArgOpen,
    TemplateArgClose,
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
    [LinkOpen, LinkClose],
    [TemplateArgOpen, TemplateArgClose],
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