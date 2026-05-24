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

    describe('simpleLink', () => {
        test('basic link produces no errors', () => {
            expect(parse('[[Article Name]]').errors).toHaveLength(0)
        })

        test('produces a simpleLink CST node', () => {
            const { cst } = parse('[[Article Name]]')
            const inline = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0]
            expect(inline.children.simpleLink[0].name).toBe('simpleLink')
        })

        test('target containing markup tokens is consumed without errors', () => {
            expect(parse("[['''not bold]]").errors).toHaveLength(0)
        })

        test('unmatched [[ is consumed as literal text without errors', () => {
            const { cst, errors } = parse('[[unfinished')
            expect(errors).toHaveLength(0)
            const inline = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0]
            expect(inline.children.simpleLink).toBeUndefined()
        })

        test('works inside a list item', () => {
            expect(parse('* [[Article]]').errors).toHaveLength(0)
        })
    })

    describe('namedLink', () => {
        test('basic named link produces no errors', () => {
            expect(parse('[[Article Name|display name]]').errors).toHaveLength(0)
        })

        test('produces a namedLink CST node', () => {
            const { cst } = parse('[[Article Name|display name]]')
            const inline = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0]
            expect(inline.children.namedLink[0].name).toBe('namedLink')
        })

        test('display name with inline markup produces no errors', () => {
            expect(parse("[[Article|'''bold display''']]").errors).toHaveLength(0)
        })

        test('display name with markup produces a line child with inline markup nodes', () => {
            const { cst } = parse("[[Article|'''bold display''']]")
            const namedLink = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0].children.namedLink[0]
            const displayLine = namedLink.children.line[0]
            expect(displayLine).toBeDefined()
            expect(displayLine.children.inline[0].children.bold).toBeDefined()
        })

        test('target containing markup tokens is consumed without errors', () => {
            expect(parse("[[Article''name|display]]").errors).toHaveLength(0)
        })

        test('without matching ]] is consumed as literal text without errors', () => {
            expect(parse('[[Article|display').errors).toHaveLength(0)
        })

        test('works inside a list item', () => {
            expect(parse('* [[Article|display]]').errors).toHaveLength(0)
        })
    })

    describe('blockquote rules', () => {
        test('single blockquote line produces no errors', () => {
            expect(parse('>text').errors).toHaveLength(0)
        })

        test('blockquote line produces a blockquote CST node inside block', () => {
            const { cst } = parse('>text')
            expect(cst.children.block[0].children.blockquote).toBeDefined()
            expect(cst.children.block[0].children.blockquote[0].name).toBe('blockquote')
        })

        test('blockquote node contains a blockquoteItem CST node', () => {
            const { cst } = parse('>text')
            const bq = cst.children.block[0].children.blockquote[0]
            expect(bq.children.blockquoteItem).toHaveLength(1)
            expect(bq.children.blockquoteItem[0].name).toBe('blockquoteItem')
        })

        test('consecutive blockquote lines cluster into one blockquote block', () => {
            const { cst, errors } = parse('>line1\n>line2\n>line3')
            expect(errors).toHaveLength(0)
            expect(cst.children.block).toHaveLength(1)
            const bq = cst.children.block[0].children.blockquote[0]
            expect(bq.children.blockquoteItem).toHaveLength(3)
        })

        test('blank line splits blockquote lines into separate blockquote blocks', () => {
            const { cst, errors } = parse('>line1\n\n>line2')
            expect(errors).toHaveLength(0)
            const bqs = cst.children.block.filter(b => b.children.blockquote)
            expect(bqs).toHaveLength(2)
        })

        test('blockquote can contain inline markup', () => {
            expect(parse(">'''bold''' text").errors).toHaveLength(0)
        })

        test('nested blockquote (>>) clusters into same blockquote block', () => {
            const { cst, errors } = parse('>line1\n>>nested\n>line2')
            expect(errors).toHaveLength(0)
            expect(cst.children.block).toHaveLength(1)
            const items = cst.children.block[0].children.blockquote[0].children.blockquoteItem
            expect(items).toHaveLength(3)
            expect(items[0].children.BQBullet[0].image.length).toBe(1)
            expect(items[1].children.BQBullet[0].image.length).toBe(2)
            expect(items[2].children.BQBullet[0].image.length).toBe(1)
        })

        test('> not at line start is not parsed as blockquote', () => {
            expect(parse('text > not blockquote').errors).toHaveLength(0)
            const { cst } = parse('text > not blockquote')
            expect(cst.children.block[0].children.blockquote).toBeUndefined()
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

    describe('templateArg', () => {
        test('{{{name}}} parses without errors', () => {
            expect(parse('{{{name}}}').errors).toHaveLength(0)
        })

        test('{{{name}}} produces a templateArg CST node in inline context', () => {
            const { cst } = parse('{{{name}}}')
            const inline = cst.children.block[0].children.paragraph[0].children.line[0].children.inline[0]
            expect(inline.children.templateArg).toBeDefined()
        })

        test('unmatched {{{ is consumed as literal text without errors', () => {
            expect(parse('{{{unmatched').errors).toHaveLength(0)
        })
    })

    describe('table', () => {
        describe('no errors', () => {
            test('single-cell table (1 row, 1 col)', () => {
                expect(parse('|| a ||').errors).toHaveLength(0)
            })

            test('single row, 2 columns', () => {
                expect(parse('|| a || b ||').errors).toHaveLength(0)
            })

            test('single row, 3 columns', () => {
                expect(parse('|| a || b || c ||').errors).toHaveLength(0)
            })

            test('2 rows, 1 column', () => {
                expect(parse('|| a ||\n|| b ||').errors).toHaveLength(0)
            })

            test('2 rows, 2 columns', () => {
                expect(parse('|| a || b ||\n|| c || d ||').errors).toHaveLength(0)
            })

            test('table followed by LF', () => {
                expect(parse('|| a ||\n').errors).toHaveLength(0)
            })

            test('multiline cell content (|| A\\nB ||) does not crash — parsed as paragraph', () => {
                expect(parse('|| A\nB ||').errors).toHaveLength(0)
            })

            test('cell containing [br] macro', () => {
                expect(parse('|| [br] ||').errors).toHaveLength(0)
            })
        })

        describe('CST structure', () => {
            test('table appears as a table node inside block', () => {
                const { cst } = parse('|| a ||')
                const table = cst.children.block[0].children.table[0]
                expect(table).toBeDefined()
                expect(table.name).toBe('table')
            })

            test('single-cell table produces 1 row with 1 line', () => {
                const { cst } = parse('|| a ||')
                const table = cst.children.block[0].children.table[0]
                expect(table.children.tableRow).toHaveLength(1)
                const row = table.children.tableRow[0]
                // one line per cell; no tableCell node
                expect(row.children.line).toHaveLength(1)
            })

            test('single-cell row: row opens with TableDelimStart and closes with TableDelim', () => {
                const { cst } = parse('|| a ||')
                const row = cst.children.block[0].children.table[0].children.tableRow[0]
                expect(row.children.TableDelimStart).toHaveLength(1)
                expect(row.children.TableDelim).toHaveLength(1) // just the closer
                expect(row.children.line).toHaveLength(1)
            })

            test('single row, 2 columns: row has 2 lines', () => {
                const { cst } = parse('|| a || b ||')
                const row = cst.children.block[0].children.table[0].children.tableRow[0]
                expect(row.children.line).toHaveLength(2)
            })

            test('single row, 2 columns: row has 1 TableDelimStart + 2 TableDelims (1 interior + 1 closer)', () => {
                const { cst } = parse('|| a || b ||')
                const row = cst.children.block[0].children.table[0].children.tableRow[0]
                expect(row.children.TableDelimStart).toHaveLength(1)
                expect(row.children.TableDelim).toHaveLength(2)
            })

            test('single row, 3 columns: row has 3 lines and 3 TableDelims (2 interior + 1 closer)', () => {
                const { cst } = parse('|| a || b || c ||')
                const row = cst.children.block[0].children.table[0].children.tableRow[0]
                expect(row.children.line).toHaveLength(3)
                expect(row.children.TableDelim).toHaveLength(3)
            })

            test('2 rows, 1 column: table has 2 rows each with 1 line', () => {
                const { cst } = parse('|| a ||\n|| b ||')
                const table = cst.children.block[0].children.table[0]
                expect(table.children.tableRow).toHaveLength(2)
                expect(table.children.tableRow[0].children.line).toHaveLength(1)
                expect(table.children.tableRow[1].children.line).toHaveLength(1)
            })

            test('2 rows, 2 columns: table has 2 rows each with 2 lines', () => {
                const { cst } = parse('|| a || b ||\n|| c || d ||')
                const table = cst.children.block[0].children.table[0]
                expect(table.children.tableRow).toHaveLength(2)
                expect(table.children.tableRow[0].children.line).toHaveLength(2)
                expect(table.children.tableRow[1].children.line).toHaveLength(2)
            })

            test('each row line node is defined', () => {
                const { cst } = parse('|| a || b ||\n|| c || d ||')
                const rows = cst.children.block[0].children.table[0].children.tableRow
                for (const row of rows) {
                    for (const line of row.children.line) {
                        expect(line).toBeDefined()
                    }
                }
            })
        })
    })
})
