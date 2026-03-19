// temporary runner for the new renderer
import { WikiParser } from "./wikiparser.js"
import { HTMLVisitor } from "./HTMLVisitor.js"
import { PreprocessVisitor } from './PreprocessVisitor.js'
import { lexer } from './lexer.js'

const parser = new WikiParser()

export function renderNew(input) {
    const { tokens } = lexer.tokenize(input)
    const cst = parser.parse(tokens)

    const preprocessVisitor = new PreprocessVisitor()
    preprocessVisitor.visit(cst)

    const visitor = new HTMLVisitor(preprocessVisitor.manifest, {
        edit: 'Edit',
        toc: 'Table of Contents',
        footnotes: 'Footnotes'
    }, {
        pagename: 'TestPage',
        renderSectionEditButton: true
    })
    const html = visitor.visit(cst)
    console.log(parser.errors)
    return html
}