import axios from 'axios'
import config from '../config/index.js'
import { CaptchaError } from '../services/errors.js'


async function chkCaptcha(req, res, next) {
    try {
        if (!config.settings.turnstile_enabled) {
            return next()
        }

        if (req.session.username) {
            const hasBypass = await req.app.locals.services.permission.permissionRepo.hasPermission(req.session.username, 'bypasscaptcha')
            if (hasBypass) {
                return next()
            }
        }

        const resToken = req.body['cf-turnstile-response']
        const url = `https://challenges.cloudflare.com/turnstile/v0/siteverify`
        const verRes = await axios.post(url, {
            secret: config.settings.turnstile_secretkey,
            response: resToken
        })
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
