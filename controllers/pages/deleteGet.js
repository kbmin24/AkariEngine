const i18n = require("i18n")
const paths = require('../../utils/paths')
const { PageNotFoundError } = require(paths.service('errors'))
const {
    load,
    renderTemplateInLayout
} = require(paths.util('httpHelper'))

module.exports = async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getDeleteViewModel({
            title: req.params.name,
            username: req.session.username
        })

        await renderTemplateInLayout(req, res, 'pages/delete.ejs', {
            title: model.title,
            l: i18n.__,
            username: model.username,
            csrfToken: req.csrfToken()
        }, {
            title: i18n.__('deletepg', { name: req.params.name }),
            isPage: true,
            pageMode: 'delete',
            pagename: model.pagename
        })
    } catch (error) {
        if (error instanceof PageNotFoundError) {
            load('error.js')(req, res, {
                description: `${i18n.__('page404')} <a href="/edit/${req.params.name}">${i18n.__('page_asknew')}</a>`,
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 404
            })
            return
        }
        throw error
    }
}
