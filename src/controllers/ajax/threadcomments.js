import sanitiseHtml from 'sanitize-html'
import renderPage from '../../pages/render.js'

export default async (req, res) => {
    const query = req.query ? req.query.q : undefined
    const comments = await req.app.locals.services.thread.getThreadComments(query)

    if (!comments) {
        res.json({})
        return
    }

    const results = []
    for (const comment of comments) {
        let content = comment.content
        if (comment.isHidden) {
            content = ''
        }

        results.push({
            type: comment.type,
            username: sanitiseHtml(comment.doneBy, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape }),
            content: await renderPage('', content, true, global.db.pages, global.db.mfile, null, null, false, false, {}, {}),
            date: comment.createdAt,
            isHidden: comment.isHidden
        })
    }

    res.json(results)
}
