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

        try {
            if (this.msRepo) {
                const [resultTitle, resultContent] = await Promise.all([
                    this.msRepo.searchByTitle(normalized, { limit: 10, offset }),
                    this.msRepo.searchByContent(normalized, { limit: 10, offset })
                ])
                return {
                    query: normalized,
                    from: offset,
                    mode: "enhanced",
                    resultTitle,
                    resultContent }
            }
        }
        catch (e) {
            logger.warn("Meilisearch failed: " + e.message)
        }

        // Fallback to DB search
        const [resultTitle, resultContent] = await Promise.all([
            this.pageRepo.searchByTitle(normalized, 10, offset),
            this.pageRepo.searchByContent(normalized, 10, offset)
        ])

        return {
            query: normalized,
            from: offset,
            mode: "basic",
            resultTitle,
            resultContent
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
        if (page) {
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
