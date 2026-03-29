import { lexer } from './lexer.js'
import { scanTokenMatches } from './scanTokenMatches.js'

function lex(input) {
    return lexer.tokenize(input).tokens
}

function scan(input) {
    return scanTokenMatches(lex(input))
}

describe('scanTokenMatches', () => {
    describe('Symmetric tokens', () => {
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
    })

    test('matching headings', () => {
        const { matchedHeadingOpens } = scan('= AB =\n== BC ==\n= B\n= A\n= C')
        expect(matchedHeadingOpens.size).toBe(2)
    })

    test('footnote-macro pairs', () => {
        const tokens = lex("Footnote[* Contents]")
        const { openers, closers } = scanTokenMatches(tokens)
        expect(openers.size).toBe(1)
        expect(closers.size).toBe(1)
        expect(openers.has(tokens[1])).toBe(true)  // FootnoteOpener
        expect(closers.has(tokens[4])).toBe(true)  // MacroCloser
    })

    describe('table delimiting', () => {
        test('unclosed table delimiter', () => {
            const tokens = lex("|| cell\n")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(0)
        })
        test('valid table delimiter start', () => {
            const tokens = lex("|| cell ||\n")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(2)
        })
        test('valid table ending at EOF', () => {
            const tokens = lex("|| cell ||")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(2)
        })
        test('Invalid token in between', () => {
            const tokens = lex("|| cell[:]{{...}} ||")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(0)
        })
        test('multiple cells', () => {
            const tokens = lex("|| cell1 || cell2 ||")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(3)
        })
        test('valid table option', () => {
            const tokens = lex("||[tablecolor=#aaa] ||")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(2)
        })
        test('valid table options, more noise', () => {
            const tokens = lex("|| [tablecolor=#aaa][tableborder=1]content||")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(2)
        })
        test('option at the end of line', () => {
            const tokens = lex("|| c ||[tablecolor=#aaa]")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(0)
        })
        test('Multiple rows', () => {
            const tokens = lex("|| cell1 ||\n|| cell2 ||\n")
            const { validTableDelims } = scanTokenMatches(tokens)
            expect(validTableDelims.size).toBe(4)
        })
    })
})
