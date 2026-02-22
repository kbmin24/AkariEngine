const ejs = require('ejs')
const paths = require('./paths')

const BACK_LINK = 'javascript:history.back()'
const LOGIN_LINK = '/login'

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function renderLayout(req, res, renderOpt) {
    require('../view.js')(req, res, renderOpt)
}

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    renderLayout(req, res, {
        ...layoutData,
        content: html
    })
}

module.exports = {
    asyncRoute,
    renderLayout,
    renderTemplateInLayout,
    BACK_LINK,
    LOGIN_LINK
}
