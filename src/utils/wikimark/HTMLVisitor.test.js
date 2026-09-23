import { HTMLVisitor } from './HTMLVisitor.js'
import { lexer } from './lexer.js'
import { WikiParser } from './wikiparser.js'

const parser = new WikiParser()

function render(input) {
    const { tokens, errors } = lexer.tokenize(input)
    expect(errors).toHaveLength(0)

    const cst = parser.parse(tokens)
    expect(parser.errors).toHaveLength(0)
    return new HTMLVisitor().visit(cst)
}

describe('HTMLVisitor inline math', () => {
    test('renders matched dollar delimiters as inline math', () => {
        expect(render('$x + 1$')).toBe("<p><span class='math'>x + 1</span></p>")
    })

    test('keeps math content opaque', () => {
        expect(render("$'''x'''$")).toBe("<p><span class='math'>'''x'''</span></p>")
    })

    test('renders currency values in separate table cells', () => {
        const html = render('|| $150 || $130 ||')
        expect(html).toContain('<td style=""> $150 </td><td style=""> $130 </td>')
        expect(html).not.toContain("class='math'")
    })
})
