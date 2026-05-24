import { WikiParser } from '../utils/wikimark/wikiparser.js'
import { PlainTextVisitor } from '../utils/wikimark/PlainTextVisitor.js'
import { lexer } from '../utils/wikimark/lexer.js'
import logger from '../utils/logger.js'

const parser = new WikiParser()
const plainTextVisitor = new PlainTextVisitor()

function toPlainText(wikitext) {
    try {
        const { tokens } = lexer.tokenize(wikitext)
        const cst = parser.parse(tokens)
        if (parser.errors.length > 0) return wikitext
        return plainTextVisitor.visit(cst)
    } catch (e) {
        logger.warn('MeilisearchRepository: plaintext conversion failed: ' + e.message)
        return wikitext
    }
}

class MeilisearchRepository {
    constructor(index) {
        this.index = index
    }

    async searchByTitle(query, { limit = 10, offset = 0 } = {}) {
        const result = await this.index.search(query, {
            limit,
            offset,
            attributesToSearchOn: ['title']
        })
        return result.hits.map(h => ({ title: h.title }))
    }

    async searchByContent(query, { limit = 10, offset = 0 } = {}) {
        const result = await this.index.search(query, {
            limit,
            offset,
            attributesToSearchOn: ['content'],
            attributesToHighlight: ['content'],
            attributesToCrop: ['content'],
            cropLength: 50,
        })
        return result.hits.map(h => ({ title: h.title, content: h._formatted.content }))
    }

    async autocomplete(query, limit = 10) {
        const result = await this.index.search(query, {
            limit,
            attributesToSearchOn: ['title']
        })
        return result.hits.map(h => ({ title: h.title }))
    }

    async addDocuments(pages) {
        const docs = [pages].flat().map(p => ({
            id: p.id,
            title: p.title,
            content: toPlainText(p.content ?? '')
        }))
        return this.index.addDocuments(docs, { primaryKey: 'id' })
    }

    async deleteDocument(pageId) {
        return this.index.deleteDocument(pageId)
    }

    // danger zone
    async deleteAllDocuments() {
        return this.index.deleteAllDocuments()
    }
}

export default MeilisearchRepository