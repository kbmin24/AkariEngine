import { lexer } from './lexer.js'
import { scanTokenMatches } from './scanTokenMatches.js'

function lex(input) {
    return lexer.tokenize(input).tokens
}

function scan(input) {
    return scanTokenMatches(lex(input))
}

describe('scanTokenMatches', () => {
    test('matched bold delimiters produce one opener and one closer', () => {
        const tokens = lex("'''bold'''")
        const { openers, closers } = scanTokenMatches(tokens)
        expect(openers.size).toBe(1)
        expect(closers.size).toBe(1)
        expect(openers.has(tokens[0])).toBe(true)
        expect(closers.has(tokens[2])).toBe(true)
    })

    test('unmatched bold delimiter produces no openers or closers', () => {
        const { openers, closers } = scan("'''unmatched")
        expect(openers.size).toBe(0)
        expect(closers.size).toBe(0)
    })

    test('matched italic delimiters produce one opener and one closer', () => {
        const tokens = lex("''italic''")
        const { openers, closers } = scanTokenMatches(tokens)
        expect(openers.has(tokens[0])).toBe(true)
        expect(closers.has(tokens[2])).toBe(true)
    })

    test('plain text produces no openers or closers', () => {
        const { openers, closers } = scan('hello world')
        expect(openers.size).toBe(0)
        expect(closers.size).toBe(0)
    })

    test('LF resets stacks so delimiters do not match across lines', () => {
        const { openers, closers } = scan("'''open\n'''")
        expect(openers.size).toBe(0)
        expect(closers.size).toBe(0)
    })

    test('nested spans each get their own opener/closer pair', () => {
        const tokens = lex("'''__bold-underline__'''")
        const { openers, closers } = scanTokenMatches(tokens)
        // BoldDelim pair + UnderlineDelim pair = 2 openers, 2 closers
        expect(openers.size).toBe(2)
        expect(closers.size).toBe(2)
    })

    test('mismatched delimiter types are tracked independently', () => {
        // ''' opens bold, '' does not close bold — both are unmatched
        const { openers, closers } = scan("'''mismatched''")
        expect(openers.size).toBe(0)
        expect(closers.size).toBe(0)
    })

    test('jagged delimiter types produce one pair of match only', () => {
        // it doesn't really matter which one is matched
        const { openers, closers } = scan("'''bold__underline'''__")
        expect(openers.size).toBe(1)
        expect(closers.size).toBe(1)
    })

    test('three bold delimeters', () => {
        const { openers, closers } = scan("'''A'''B'''")
        expect(openers.size).toBe(1)
        expect(closers.size).toBe(1)
    })

    test ('matching headings', () => {
        const { matchedHeadingOpens } = scan('= AB =\n== BC ==\n= B\n= A\n= C')
        expect(matchedHeadingOpens.size).toBe(2)
    })
})
