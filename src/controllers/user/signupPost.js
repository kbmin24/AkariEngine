import i18n from 'i18n'
import renderInfo from '../../info.js'
import sendFilePage from '../../sendfile.js'
import renderError from '../../utils/error.js'
import logger from '../../utils/logger.js'

export default async (req, res) => {
    //req.body.id,req.body.password,req.body.passwordConfirm

    if (req.body.password != req.body.passwordConfirm) {
        renderInfo(req, res, { description: res.__('register_pwNotMatch'), returnLink: '/signup', returnName: res.__('register') })
        return
    }

    try {
        await req.app.locals.services.user.register(req.body.id, req.body.password)
        await sendFilePage(req, res, i18n.__('register_done'), 'src/views/user/signupnotify.html')
    }
    catch (e) {
        logger.error(`Registration error\nid: ${req.body.id}\nerror: ${e.stack}`)
        renderError(req, res, { description: i18n.__('register_fail'), returnLink: '/signup', returnName: i18n.__('register'), statusCode: 500 })
    }
}
