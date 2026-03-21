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

    describe('orderedList rules', () => {
        test('single ordered list item produces no errors', () => {
            expect(parse('# item').errors).toHaveLength(0)
        })

        test('multiple depths produce no errors', () => {
            expect(parse('## item').errors).toHaveLength(0)
            expect(parse('### item').errors).toHaveLength(0)
        })

        test('ordered list item produces an orderedList CST node inside block', () => {
            const { cst } = parse('# item')
            expect(cst.children.block[0].children.orderedList).toBeDefined()
            expect(cst.children.block[0].children.orderedList[0].name).toBe('orderedList')
        })

        test('orderedList node contains an orderedListItem CST node', () => {
            const { cst } = parse('# item')
            const list = cst.children.block[0].children.orderedList[0]
            expect(list.children.orderedListItem).toHaveLength(1)
            expect(list.children.orderedListItem[0].name).toBe('orderedListItem')
        })

        test('depth 1 item has OLBullet image length 1', () => {
            const { cst } = parse('# item')
            const item = cst.children.block[0].children.orderedList[0].children.orderedListItem[0]
            expect(item.children.OLBullet[0].image.length).toBe(1)
        })

        test('depth 2 item has OLBullet image length 2', () => {
            const { cst } = parse('## item')
            const item = cst.children.block[0].children.orderedList[0].children.orderedListItem[0]
            expect(item.children.OLBullet[0].image.length).toBe(2)
        })

        test('consecutive ordered list items cluster into one orderedList block', () => {
            const { cst, errors } = parse('# item1\n# item2\n# item3')
            expect(errors).toHaveLength(0)
            expect(cst.children.block).toHaveLength(1)
            const list = cst.children.block[0].children.orderedList[0]
            expect(list.children.orderedListItem).toHaveLength(3)
        })

        test('blank line splits ordered list items into separate orderedList blocks', () => {
            const { cst, errors } = parse('# item1\n\n# item2')
            expect(errors).toHaveLength(0)
            const lists = cst.children.block.filter(b => b.children.orderedList)
            expect(lists).toHaveLength(2)
        })

        test('ul and ol on adjacent lines form separate list blocks', () => {
            const { cst, errors } = parse('* ul item\n# ol item')
            expect(errors).toHaveLength(0)
            const blocks = cst.children.block
            expect(blocks.some(b => b.children.unorderedList)).toBe(true)
            expect(blocks.some(b => b.children.orderedList)).toBe(true)
        })

        test('# with no content after space is not parsed as an ordered list item', () => {
            expect(parse('# ').errors).toHaveLength(0)
            expect(parse('# \n').errors).toHaveLength(0)
        })

        test('#text with no space is not parsed as an ordered list item', () => {
            expect(parse('#text').errors).toHaveLength(0)
            const { cst } = parse('#text')
            expect(cst.children.block[0].children.orderedList).toBeUndefined()
        })

        test('ordered list item can contain inline markup', () => {
            expect(parse("# '''bold''' item").errors).toHaveLength(0)
        })
    })

    describe('list rules', () => {
        test('single list item produces no errors', () => {
            expect(parse('* item').errors).toHaveLength(0)
        })

        test('multiple depths produce no errors', () => {
            expect(parse('** item').errors).toHaveLength(0)
            expect(parse('*** item').errors).toHaveLength(0)
        })

        test('list item produces a list CST node inside block', () => {
            const { cst } = parse('* item')
            expect(cst.children.block[0].children.unorderedList).toBeDefined()
            expect(cst.children.block[0].children.unorderedList[0].name).toBe('unorderedList')
        })

        test('unorderedList node contains an unorderedListItem CST node', () => {
            const { cst } = parse('* item')
            const list = cst.children.block[0].children.unorderedList[0]
            expect(list.children.unorderedListItem).toHaveLength(1)
            expect(list.children.unorderedListItem[0].name).toBe('unorderedListItem')
        })

        test('depth 1 item has ULBullet image length 1', () => {
            const { cst } = parse('* item')
            const listItem = cst.children.block[0].children.unorderedList[0].children.unorderedListItem[0]
            expect(listItem.children.ULBullet[0].image.length).toBe(1)
        })

        test('depth 2 item has ULBullet image length 2', () => {
            const { cst } = parse('** item')
            const listItem = cst.children.block[0].children.unorderedList[0].children.unorderedListItem[0]
            expect(listItem.children.ULBullet[0].image.length).toBe(2)
        })

        test('depth 3 item has ULBullet image length 3', () => {
            const { cst } = parse('*** item')
            const listItem = cst.children.block[0].children.unorderedList[0].children.unorderedListItem[0]
            expect(listItem.children.ULBullet[0].image.length).toBe(3)
        })

        test('consecutive list items cluster into one list block', () => {
            const { cst, errors } = parse('* item1\n* item2\n* item3')
            expect(errors).toHaveLength(0)
            expect(cst.children.block).toHaveLength(1)
            const list = cst.children.block[0].children.unorderedList[0]
            expect(list.children.unorderedListItem).toHaveLength(3)
        })

        test('mixed depths in one list cluster into one list block', () => {
            const { cst, errors } = parse('* item1\n** nested\n* item2')
            expect(errors).toHaveLength(0)
            expect(cst.children.block).toHaveLength(1)
            const items = cst.children.block[0].children.unorderedList[0].children.unorderedListItem
            expect(items).toHaveLength(3)
            expect(items[0].children.ULBullet[0].image.length).toBe(1)
            expect(items[1].children.ULBullet[0].image.length).toBe(2)
            expect(items[2].children.ULBullet[0].image.length).toBe(1)
        })

        test('blank line splits consecutive list items into separate list blocks', () => {
            const { cst, errors } = parse('* item1\n\n* item2')
            expect(errors).toHaveLength(0)
            const lists = cst.children.block.filter(b => b.children.unorderedList)
            expect(lists).toHaveLength(2)
        })

        test('* with no content after space is not parsed as a list item', () => {
            // falls through to paragraph — must not error
            expect(parse('* ').errors).toHaveLength(0)
            expect(parse('* \n').errors).toHaveLength(0)
        })

        test('*text with no space is not parsed as a list item', () => {
            expect(parse('*text').errors).toHaveLength(0)
            const { cst } = parse('*text')
            expect(cst.children.block[0].children.unorderedList).toBeUndefined()
        })

        test('list item not at line start is not parsed as a list item', () => {
            // leading space — treated as paragraph inline content
            expect(parse(' * text').errors).toHaveLength(0)
            const { cst } = parse(' * text')
            expect(cst.children.block[0].children.unorderedList).toBeUndefined()
        })

        test('list item can contain inline markup', () => {
            expect(parse("* '''bold''' item").errors).toHaveLength(0)
        })
    })

    describe('ul/ol nasty rules', () => {
        test('block-level construct in bullet', () => {
            expect(parse("* [toc]").errors).toHaveLength(0)
            expect(parse("# [)]{{Align}}").errors).toHaveLength(0)
            expect(parse("* [:]{{").errors).toHaveLength(0)
            expect(parse("* [footnotE]").errors).toHaveLength(0)
        })
    })
})
