import { ValidationError } from './errors.js'
import logger from '../utils/logger.js'

class SearchService {
    constructor(pageRepo, msRepo = null) {
        this.pageRepo = pageRepo
        this.msRepo = msRepo
    }

    async searchPages(query, limit = 10) {
        return this.pageRepo.searchByTitle(query, limit)
    }

    async getSearchViewModel({ query, from = 0 }) {
        const normalized = String(query || '').trim()
        if (!normalized) {
            throw new ValidationError({
                message: 'Empty search',
                statusCode: 400,
                code: 'SEARCH_QUERY_EMPTY'
            })
        }

        const offset = Number(from)
        if (!Number.isInteger(offset) || offset < 0) {
            throw new ValidationError({
                message: 'The query must be a number.',
                statusCode: 400,
                code: 'SEARCH_FROM_INVALID'
            })
        }

        const PAGE_SIZE = 10

        try {
            if (this.msRepo) {
                const [rawTitle, rawContent] = await Promise.all([
                    this.msRepo.searchByTitle(normalized, { limit: PAGE_SIZE + 1, offset }),
                    this.msRepo.searchByContent(normalized, { limit: PAGE_SIZE + 1, offset })
                ])
                return {
                    query: normalized,
                    from: offset,
                    mode: "enhanced",
                    hasMore: rawTitle.length > PAGE_SIZE || rawContent.length > PAGE_SIZE,
                    resultTitle: rawTitle.slice(0, PAGE_SIZE),
                    resultContent: rawContent.slice(0, PAGE_SIZE),
                }
            }
        }
        catch (e) {
            logger.warn("Meilisearch failed: " + e.message)
        }

        // Fallback to DB search
        const [rawTitle, rawContent] = await Promise.all([
            this.pageRepo.searchByTitle(normalized, PAGE_SIZE + 1, offset),
            this.pageRepo.searchByContent(normalized, PAGE_SIZE + 1, offset)
        ])

        return {
            query: normalized,
            from: offset,
            mode: "basic",
            hasMore: rawTitle.length > PAGE_SIZE || rawContent.length > PAGE_SIZE,
            resultTitle: rawTitle.slice(0, PAGE_SIZE),
            resultContent: rawContent.slice(0, PAGE_SIZE),
        }
    }

    async resolveSearchRedirect({ query }) {
        const normalized = String(query || '').trim()
        if (!normalized) {
            throw new ValidationError({
                message: 'The query is empty.',
                statusCode: 400,
                code: 'SEARCH_QUERY_EMPTY'
            })
        }

        const page = await this.pageRepo.findByTitle(normalized)
        if (page && !page.deleted) {
            return `/w/${normalized}`
        }

        return `/search?q=${encodeURIComponent(normalized)}`
    }

    async autocompletePages(query, limit = 10) {
        if (!query || typeof query !== 'string') return []

        const normalized = query.trim()
        if (!normalized) return []

        if (this.msRepo) {
            return this.msRepo.autocomplete(normalized, limit)
        }

        return this.pageRepo.autocompleteByPrefix(normalized, limit)
    }
}

export default SearchService
