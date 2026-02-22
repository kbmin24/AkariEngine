const i18n = require('i18n')
const paths = require('../../utils/paths')
const { renderTemplateInLayout, load, BACK_LINK } = require('../../utils/httpHelper')
const {
    PageNotFoundError,
    ValidationError
} = require(paths.resolve('services', 'errors.js'))


module.exports = async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getMoveViewModel({
            title: req.params.name,
            username: req.session.username
        })

        const captchaSVG = await load('utils', 'captcha.js').genCaptcha()
        await renderTemplateInLayout(req, res, 'pages/move.ejs', {
            originalName: model.originalName,
            l: i18n.__,
            username: model.username,
            captcha: captchaSVG,
            csrfToken: req.csrfToken()
        }, {
            title: i18n.__('movepg', { name: req.params.name }),
            isPage: true,
            pagename: req.params.name,
            pageMode: 'move',
            username: model.username,
            ipaddr: req.ipAddress
        })
    } catch (error) {
        if (error instanceof ValidationError && error.i18nKey === 'move_nofile') {
            require(paths.utils('error'))(req, res, {
                description: i18n.__('move_nofile'),
                returnLink: BACK_LINK,
                returnName: i18n.__('previousPage'),
                statusCode: 200
            })
            return
        }
        if (error instanceof PageNotFoundError) {
            require(paths.utils('error'))(req, res, {
                description: `${i18n.__('page404')} <a href="/edit/${req.params.name}"> ${i18n.__('page_asknew')}</a>`,
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 404
            })
            return
        }
        throw error
    }
}
