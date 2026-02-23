import i18n from 'i18n'
import { renderTemplateInLayout, BACK_LINK } from '../../utils/httpHelper.js'
import { PageNotFoundError, ValidationError } from '../../services/errors.js'
import { genCaptcha } from '../../utils/captcha.js'
import renderError from '../../utils/error.js'


export default async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getMoveViewModel({
            title: req.params.name,
            username: req.session.username
        })

        const captchaSVG = await genCaptcha()
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
            renderError(req, res, {
                description: i18n.__('move_nofile'),
                returnLink: BACK_LINK,
                returnName: i18n.__('previousPage'),
                statusCode: 200
            })
            return
        }
        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
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
