import config from '../config/index.js'
import axios from 'axios'

// todo: move genCaptcha to middleware too

const genCaptcha = () =>
{
    if (!config.settings.reCAPTCHA_enabled) return ""
    return `<div class="g-recaptcha" data-sitekey="${config.settings.reCAPTCHA}"></div>`
}

// Deprecated
const chkCaptcha = async (req, res, perm) =>
{
    //check if the user has bypasscaptcha perm
    if (req.session.username && (await perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}})))
        return true //dont check
    const resKey = req.body['g-recaptcha-response']
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${global.conf.reCAPTCHA_prv}&response=${resKey}`
    
    try
    {
        const verRes = await axios.post(url)
        const data = verRes.data || {}
        if (data.success === true)
        {
            return true
        }
        else
        {
            require('./error.js')(req, res, null, {
                description: global.i18n.__('captcha_notdone'),
                returnLink: 'javascript:window.history.back()',
                returnName: global.i18n.__('previousPage'),
                statusCode: 200
            })
            return false
        }
    }
    catch
    {
        require('./error.js')(req, res, null, {
            description: global.i18n.__('captcha_verifyfail'),
            returnLink: 'javascript:window.history.back()',
            returnName: global.i18n.__('previousPage'),
            statusCode: 200
        })
        return false
    }
}

export {
    genCaptcha,
    chkCaptcha
}
