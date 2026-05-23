import axios from 'axios'
import config from '../config/index.js'
import { CaptchaError } from '../services/errors.js'


async function chkCaptcha(req, res, next) {
    try {
        if (!config.settings.reCAPTCHA_enabled) {
            return next()
        }

        if (req.session.username) {
            const hasBypass = await req.app.locals.services.permission.permissionRepo.hasPermission(req.session.username, 'bypasscaptcha')
            if (hasBypass) {
                return next()
            }
        }

        const resKey = req.body['g-recaptcha-response']
        const url = `https://www.google.com/recaptcha/api/siteverify?secret=${config.settings.reCAPTCHA_prv}&response=${resKey}`
        const verRes = await axios.post(url, null, { timeout: 10000 })
        const data = verRes.data || {}
        if (data.success === true) {
            return next()
        }

        next(new CaptchaError({ i18nKey: 'captcha_notdone' }))
    } catch (_error) {
        next(new CaptchaError({ i18nKey: 'captcha_verifyfail' }))
    }
}

export {
    chkCaptcha
}
