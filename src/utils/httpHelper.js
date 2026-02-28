import ejs from 'ejs'
import paths from './paths.js'
import renderView from '../view.js'

const BACK_LINK = 'javascript:history.back()'
const LOGIN_LINK = '/login'

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function renderLayout(req, res, renderOpt) {
    renderView(req, res, renderOpt)
}

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    renderLayout(req, res, {
        ...layoutData,
        content: html
    })
}

export {
    asyncRoute,
    renderLayout,
    renderTemplateInLayout,
    BACK_LINK,
    LOGIN_LINK
}
