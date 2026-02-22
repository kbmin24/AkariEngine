const i18n = require('i18n')
const { renderTemplateInLayout } = require('../../utils/httpHelper.js')

module.exports = async (req, res) => {
    const username = req.session.username
    const p = await req.app.locals.repositories.pages.findByTitle(req.params.name)
    if (!p) {
        require('../../utils/error.js')(req, res, {
            description: `${i18n.__('page404')} <a href="/edit/${req.params.name}">${i18n.__('page_asknew')}</a>`,
            returnLink: '/',
            returnName: i18n.__('mainpage'),
            statusCode: 404
        })
        return
    }
    const captchaSVG = await require('../../utils/captcha.js').genCaptcha()

    await renderTemplateInLayout(req, res, 'pages/revert.ejs', {
        pagename: req.params.name,
        l: i18n.__,
        username: username,
        rev: req.query.rev,
        captcha: captchaSVG,
        csrfToken: req.csrfToken()
    }, {
        title: i18n.__('revert_title', { page: req.params.name, rev: req.query.rev }),
    })
}
