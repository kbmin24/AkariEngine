// testing file
import { WikiParser } from "./wikiparser.js"
import { HTMLVisitor } from "./HTMLVisitor.js"
import { PreprocessVisitor } from './PreprocessVisitor.js'
import { lexer } from './lexer.js'

const parser = new WikiParser()

function parse(input) {
    const { tokens } = lexer.tokenize(input)
    const cst = parser.parse(tokens)

    const preprocessVisitor = new PreprocessVisitor()
    preprocessVisitor.visit(cst)

    const visitor = new HTMLVisitor(preprocessVisitor.manifest)
    const html = visitor.visit(cst)
    console.log(parser.errors)
    return html
}
const input = `ABC DEF [)]{{ABC}} DEF`

const html = parse(input)
console.log(html)