import i18n from 'i18n'
import { getCategory, getOptions } from '../../pages/view.js'
import renderPage from '../../pages/render.js'
import renderView from '../../view.js'

export default async (req, res) => {
    let title = req.body.title
    let rawContent = req.body.content
    let opt = await getOptions(rawContent)
    let renderedContent = await renderPage(title, rawContent, true, global.db.pages, global.db.files, req, res, false, true, {}, opt)

    renderedContent = (await getCategory(title, global.db.category, opt['category'])) + renderedContent
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
