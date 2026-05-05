import renderInfo from '../../info.js'
import renderError from '../../utils/error.js'
import { BACK_LINK, LOGIN_LINK } from '../../utils/httpHelper.js'
import { ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    if (!req.session.username) {
        renderError(req, res, { description: res.__('loginRequired'), returnLink: LOGIN_LINK, returnName: res.__('loginpage'), statusCode: 403 })
        return
    }
    switch (req.params.name) {
        case "changeSkin":
            {
                await req.app.locals.services.user.changeSkin(req.session.username, req.body.skin)
                renderInfo(req, res, { description: res.__('done'), returnLink: '/settings', returnName: res.__('settings') })
                return
            }
        case 'changePassword':
            {
                try {
                    await req.app.locals.services.user.changePassword(req.session.username, req.body.oldpassword, req.body.password)
                    renderInfo(req, res, { description: res.__('done'), returnLink: '/settings', returnName: res.__('settings') })
                } catch (error) {
                    if (error instanceof ValidationError) {
                        renderInfo(req, res, { description: res.__('invalidpassword'), returnLink: BACK_LINK, returnName: res.__('previousPage'), statusCode: 400 })
                    }
                    renderError(req, res, { description: error.message, returnLink: BACK_LINK, returnName: res.__('previousPage'), statusCode: 403 })
                }
                return
            }
    }
}
