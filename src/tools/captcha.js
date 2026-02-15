const svgCaptcha = require('svg-captcha')
const axios = require('axios')
const paths = require('../utils/paths')
const config = require(paths.resolve('/config/'))

function genArbitaryString(len)
{
    //https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    let res = ''
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charLen = chars.length
    for (let i = 0; i < len; i++)
    {
        res += chars.charAt(Math.floor(Math.random() * charLen))
    }
    return res
}
exports.genArbitaryString = genArbitaryString
exports.genCaptcha = async (req) =>
{
    if (!config.settings.reCAPTCHA_enabled) return ""
    return `<div class="g-recaptcha" data-sitekey="${config.settings.reCAPTCHA}"></div>`
}
exports.chkCaptcha = async (req, res, perm) =>
{
    //check if the user has bypasscaptcha perm or if captcha is disabled
    if (!config.settings.reCAPTCHA_enabled) return true
    if (req.session.username && (await perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}})))
        return true //dont check
    const resKey = req.body['g-recaptcha-response']
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${config.settings.reCAPTCHA_prv}&response=${resKey}`
    
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
            require(paths.resolve('error.js'))(req, res, null, global.i18n.__('captcha_notdone'), 'javascript:window.history.back()', global.i18n.__('previousPage'), 200)
            return false
        }
    }
    catch (err)
    {
        require(paths.resolve('error.js'))(req, res, null, global.i18n.__('captcha_verifyfail'), 'javascript:window.history.back()', global.i18n.__('previousPage'), 200)
        return false
    }
}
