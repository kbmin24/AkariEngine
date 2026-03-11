// testing file
import { WikiParser } from "./wikiparser.js"
import { HTMLVisitor } from "./HTMLVisitor.js"
import { PreprocessVisitor } from './PreprocessVisitor.js'
import { lexer } from './lexer.js'

import fs from 'fs'

const parser = new WikiParser()

function parse(input) {
    const { tokens } = lexer.tokenize(input)
    const cst = parser.parse(tokens)

    const preprocessVisitor = new PreprocessVisitor()
    preprocessVisitor.visit(cst)

    const visitor = new HTMLVisitor(preprocessVisitor.manifest, {
        edit: 'Edit',
        toc: 'Table of Contents'
    }, {
        pagename: 'TestPage',
        renderSectionEditButton: true
    })
    const html = visitor.visit(cst)
    console.log(parser.errors)
    return html
}
//console.log(parse("= AB =\nABC\n= BC =\nXYZ"))

const input = fs.readFileSync('src/utils/wikimark/.tests/in.wiki', 'utf-8')

const html = parse(input)
fs.writeFileSync('src/utils/wikimark/.tests/out.html', html)
