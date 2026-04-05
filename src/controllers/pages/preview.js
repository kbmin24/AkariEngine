import i18n from 'i18n'
import { getCategory, getOptions } from '../../utils/wikimark/keywordHelper.js'
import renderView from '../../view.js'

export default async (req, res) => {
    let title = req.body.title
    let rawContent = req.body.content
    let opt = await getOptions(rawContent)
    
    let { html: renderedContent } = await req.app.locals.services.render.render(rawContent,
                    { pagename: title, renderSectionEditButton: false },
                    req.app.locals.repositories,
                    false)
    renderedContent = (await getCategory(title, req.app.locals.repositories.categories, opt['category'])) + renderedContent
    renderedContent = `<div class='alert alert-warning' role='alert'>${i18n.__('previewWarning')}</div>` + renderedContent
    let renderOpt = {
        title,
        titleInfo: `(<i>${i18n.__('preview')}</i>)`,
        content: renderedContent,
        isPage: true,
        pagename: title,
        ipaddr: req.ipAddress,
        username: req.session.username,

    }
    renderView(req, res, renderOpt)
}
