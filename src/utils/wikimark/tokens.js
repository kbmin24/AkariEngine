import { createToken, Lexer } from "chevrotain"

// we need four slashes to bc it is escaped twice...
const BSLASH = '\\\\'

const SPECIAL_CHARS = `_'^,"/[\\](){}:=${BSLASH}\\r\\n`

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
        if (offset !== 0 && text[offset - 1] !== '\n') return null
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
    const openPat = new RegExp(eqStr, 'y')
    const closePat = new RegExp(`${eqStr}[ \\t]*(?=\\n|$)`, 'y')
    headingTokens[`H${n}Open`] = createToken({
        name: `H${n}Open`,
        pattern: (text, offset) => {
            if (offset !== 0 && text[offset - 1] !== '\n') return null
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

const Text = createToken({
    name: 'Text',
    pattern: new RegExp(`[^${SPECIAL_CHARS}]+|[${SPECIAL_CHARS}]`),
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
    SupDelim,
    SubDelim,
    BigDelim,
    CR,
    LF,
    Comment,
    ...headingTokens,
    Text
}

export const allTokens = Object.values(T)

export const inlineTokens = new Set([
    EscapeChar,
    UnderlineDelim,
    BoldDelim,
    BoldItalicDelim,
    ItalicDelim,
    SupDelim,
    SubDelim,
    BigDelim,
    Text
])

export const symmetricTokens = new Set([
    UnderlineDelim,
    BoldItalicDelim,
    BoldDelim,
    ItalicDelim,
    SupDelim,
    SubDelim,
    BigDelim
])