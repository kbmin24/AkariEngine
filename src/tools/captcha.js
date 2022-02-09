const svgCaptcha = require('svg-captcha')
const axios = require('axios')

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
    return `<div class="g-recaptcha" data-sitekey="${global.conf.reCAPTCHA}"></div>`
}
exports.chkCaptcha = async (req, res, perm) =>
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
            require(global.path + '/error.js')(req, res, null, `CAPTCHA를 올바르게 완성해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            return false
        }
    }
    catch (err)
    {
        require(global.path + '/error.js')(req, res, null, `reCAPTCHA를 확인하는 도중 오류가 발생하였습니다.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
        return false
    }
}