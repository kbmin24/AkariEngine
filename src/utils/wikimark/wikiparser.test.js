import { lexer } from './lexer.js'
import { WikiParser } from './wikiparser.js'

const parser = new WikiParser()

function parse(input) {
    const { tokens } = lexer.tokenize(input)
    const cst = parser.parse(tokens)
    return { cst, errors: parser.errors }
}

describe('WikiParser', () => {
    describe('valid input produces no errors', () => {
        test('plain text', () => {
            expect(parse('hello world').errors).toHaveLength(0)
        })

        test('bold', () => {
            expect(parse("'''bold'''").errors).toHaveLength(0)
        })

        test('italic', () => {
            expect(parse("''italic''").errors).toHaveLength(0)
        })

        test('nested spans', () => {
            expect(parse("'''__bold underline__'''").errors).toHaveLength(0)
        })

        test('multiline within paragraph', () => {
            expect(parse("line one\nline two").errors).toHaveLength(0)
        })

        test('two paragraphs', () => {
            expect(parse("para one\n\npara two").errors).toHaveLength(0)
        })

        test('leftalign block', () => {
            expect(parse("[(]{{text}}").errors).toHaveLength(0)
        })

        test('lots of line breaks', () => {
            expect(parse("\r\n\r\n\r\n\n\n\n\n\n\n\n\n\r\n").errors).toHaveLength(0)
        })

        test('bold&italic', () => {
            expect(parse("'''''bold-italic'''''").errors).toHaveLength(0)
            expect(parse("'' '''bold-italic''' ''").errors).toHaveLength(0)
        })
    })

    describe('Renders malformed inputs without errors', () => {
        test('unmatched title regex', () => {
            expect(parse("== AB =").errors).toHaveLength(0)
        })
        test('= AB', () =>
        {
            expect(parse("= AB").errors).toHaveLength(0)
        })
    })

    describe('error recovery', () => {
        test('unmatched bold delimiter produces no errors', () => {
            expect(parse("'''unmatched").errors).toHaveLength(0)
        })

        test('unmatched italic delimiter produces no errors', () => {
            expect(parse("''unmatched").errors).toHaveLength(0)
        })

        test('mismatched delimiters produce no errors', () => {
            expect(parse("'''mismatched''").errors).toHaveLength(0)
        })

        test('jagged delimiters produce no errors', () => {
            expect(parse("'''bold__underline'''__").errors).toHaveLength(0)
        })
    })

    describe('CST structure', () => {
        test('top-level node is document', () => {
            const { cst } = parse('hello')
            expect(cst.name).toBe('document')
        })

        test('document contains block nodes', () => {
            const { cst } = parse('hello')
            expect(cst.children.block).toHaveLength(1)
            expect(cst.children.block[0].name).toBe('block')
        })

        test('leftalign block produces a leftalign CST node', () => {
            const { cst } = parse('[(]{{text}}')
            expect(cst.children.block[0].children.leftalign).toBeDefined()
            expect(cst.children.block[0].children.leftalign[0].name).toBe('leftalign')
        })

        test('bold produces a bold CST node', () => {
            const { cst } = parse("'''bold'''")
            const inline = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0]
            expect(inline.children.bold).toBeDefined()
            expect(inline.children.bold[0].name).toBe('bold')
        })
    })

    describe('alignment rules', () => {
        test('Center align', () => {
            const { cst } = parse("[:]{{centered}}")
            expect(cst.children.block[0].children.centeralign).toBeDefined()
            expect(cst.children.block[0].children.centeralign[0].name).toBe('centeralign')
        })
        test("Right align in center align", () => {
            const { cst } = parse("[:]{{centered\n[)]{{right}}}}")
            const center = cst.children.block[0].children.centeralign[0]
            expect(center).toBeDefined()
            expect(center.name).toBe('centeralign')

            const right = center.children.block[2].children.rightalign[0]
            expect(right).toBeDefined()
            expect(right.name).toBe('rightalign')
        })
        test("LF around left align", () => {
            const { cst } = parse("[(]{{\nASDF\n}}")
            const children = cst.children.block[0].children.leftalign[0].children
            expect(children.block).toHaveLength(1)
        })
    })
    describe('heading rules', () => {
        test("matches h1 and generates valid cst tree", () => {
            const { cst } = parse("= h1 =")
            const h1 = cst.children.block[0].children.heading[0].children.h1[0]
            expect(h1).toBeDefined()
        })
    })

    describe('Footnote', () => {
        test("footnote with text", () => {
            expect(parse("Footnote[* Footnote contents]").errors).toHaveLength(0)
        })
    })
})
