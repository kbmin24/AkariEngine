const svgCaptcha = require('svg-captcha')

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
    //check ignorecaptcha
    const c = svgCaptcha.create(
        {
            size: 4,
            noise: 3,
            ignoreChars: '0o1iI5SsvuVUCcGg',
            color: false
        }
    )
    const svg = c.data
    const text = c.text
    req.session.captcha = text
    return svg
}
exports.chkCaptcha = async (req, res, perm) =>
{
    //check if the user has bypasscaptcha perm
    if (req.session.username && (await perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}})))
        return true //dont check
    if (req.body.captcha !== req.session.captcha)
    {
        //raise error
        require(global.path + '/error.js')(req, res, null, 'Please complete CAPTCHA correctly.', 'javascript:window.history.back()', 'the previous page')
        return false
    }
    else
    {
        //assign arbitary value to CAPTCHA session
        req.session.captcha = genArbitaryString(16)
        return true
    }
}
exports.chkCaptchaUpload = (req, perm) =>
{
    perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}}).then(p =>
        {
            if (p) return true
            if (req.body.captcha !== req.session.captcha)
            {
                return false
            }
            else
            {
                //assign arbitary value to CAPTCHA session
                req.session.captcha = genArbitaryString(16)
                return true
            }
        })
}