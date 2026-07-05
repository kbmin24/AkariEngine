import sanitizeHTML from 'sanitize-html'

export default async (req, res) => {
    const model = await req.app.locals.services.search.getSearchViewModel({
        query: req.query.q,
        from: req.query.from || 0
    })

    res.json({
        query: model.query,
        resultTitle: model.resultTitle.map(r => ({
            ...r,
            snippet: sanitizeHTML(r.content || '', { allowedTags: ['em'], allowedAttributes: {}, disallowedTagsMode: 'escape' })
        })),
        resultContent: model.resultContent.map(r => ({
            ...r,
            snippet: sanitizeHTML(r.content || '', { allowedTags: ['em'], allowedAttributes: {}, disallowedTagsMode: 'escape' })
        })),

        searchMode: model.mode,
        hasMore: model.hasMore,
        from: model.from
    })
}
