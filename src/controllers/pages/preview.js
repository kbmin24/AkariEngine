import { showCategory, getOptions } from '../../utils/wikimark/keywordHelper.js'

export default async (req, res) => {
    const title = req.body.title
    const rawContent = req.body.content
    const opt = await getOptions(rawContent)

    let { html: content } = await req.app.locals.services.render.render(
        rawContent,
        res.__,
        { pagename: title, renderSectionEditButton: false },
        false
    )

    const categories = await req.app.locals.services.category.extractFromContent(rawContent)

    res.json({
        title,
        content: content,
        categories,
        showCategory: showCategory(title, opt['category']),
        isPreview: true,
        pagename: title
    })
}
