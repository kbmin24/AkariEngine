import sanitiseHtml from 'sanitize-html'
import RenderService from '../../services/RenderService.js'
import repositories from '../../repositories/index.js'

const threadRenderer = new RenderService(repositories.pages, repositories.files)

export default async (req, res) => {
    const query = req.query ? req.query.q : undefined
    const comments = await req.app.locals.services.thread.getThreadComments(
        req.session.username,
        req.ipAddress,
        query
    )

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

        //render to wikitext
        const contentHTML = (await threadRenderer.render(content, {}, false)).html

        results.push({
            type: comment.type,
            username: sanitiseHtml(comment.doneBy, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape }),
            content: contentHTML,
            date: comment.createdAt,
            isHidden: comment.isHidden
        })
    }

    res.json(results)
}
