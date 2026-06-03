import { getCategory, getOptions } from '../../utils/wikimark/keywordHelper.js'

export default async (req, res) => {
    const title = req.body.title
    const rawContent = req.body.content
    const opt = await getOptions(rawContent)

    let { html: content } = await req.app.locals.services.render.render(
        rawContent,
        { pagename: title, renderSectionEditButton: false },
        req.app.locals.repositories,
        false
    )

    const categoryHtml = await getCategory(title, req.app.locals.repositories.categories, opt['category'])

    res.json({
        title,
        content: categoryHtml + content,
        isPreview: true,
        pagename: title
    })
}
