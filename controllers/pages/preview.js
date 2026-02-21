const paths = require('../../utils/paths')
const i18n = require("i18n")
const { getCategory, getOptions } = require(paths.pages('view'))

module.exports = async (req, res) => {
    let title = req.body.title
    let rawContent = req.body.content
    let opt = await getOptions(rawContent)
    let renderedContent = await require(paths.pages('render'))(title, rawContent, true, pages, files, req, res, false, true, {}, opt)

    renderedContent = await getCategory(title, category, opt['category']) + renderedContent
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
    require(paths.resolve('view.js'))(req, res, renderOpt)
}