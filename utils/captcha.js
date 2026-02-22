const config = require('../config')

// todo: move genCaptcha to middleware too

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
exports.genCaptcha = async () =>
{
    if (!config.settings.reCAPTCHA_enabled) return ""
    return `<div class="g-recaptcha" data-sitekey="${config.settings.reCAPTCHA}"></div>`
}
