import i18n from 'i18n'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'
import renderError from '../../utils/error.js'
import { genCaptcha } from '../../utils/captcha.js'

export default async (req, res) => {
    const username = req.session.username
    const p = await req.app.locals.repositories.pages.findByTitle(req.params.name)
    if (!p) {
        renderError(req, res, {
            description: `${i18n.__('page404')} <a href="/edit/${req.params.name}">${i18n.__('page_asknew')}</a>`,
            returnLink: '/',
            returnName: i18n.__('mainpage'),
            statusCode: 404
        })
        return
    }
    const captchaSVG = await genCaptcha()

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
