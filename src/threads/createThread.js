const sanitiseHtml = require('sanitize-html')
const paths = require('../utils/paths')
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
module.exports = async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block

    let captchaSuccess = await require(paths.resolve('tools', 'captcha.js')).chkCaptcha(req, res, dbs['perm'])
    if (!captchaSuccess) return //CAPTCHA error

    const title = req.params.name


    const r = await require(paths.resolve('pages', 'satisfyACL.js'))(req, res, ['everyone'], null, dbs['block'])
    if (!r)
    {
        require(paths.resolve('error.js'))(req, res, null, 'You cannot crate a thread because you are blocked' + '.', '/', 'the main page')
        return
    }

    //First check whether the page exists
    if (!(await dbs['pages'].findOne({where: {title: title}})))
    {
        require(paths.resolve('error.js'))(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', code=404)
        return
    }

    //And check whether datas are given
    if (!req.body.title)
    {
        require(paths.resolve('error.js'))(req, res, null, 'Please enter a title.', '/', 'the main page', code=404)
        return
    }

    //fallback
    if (!req.body.comment)
    {
        req.body.comment = `''No Description Given.''`
    }

    let threadID = ''
    while (threadID === '')
    {
        let newID = genArbitaryString(11) //somehow youtube uses 11 as well.
        if (!(await dbs['thread'].findOne({where: {threadID: newID}}))) threadID = newID
    }
    await dbs['thread'].create(
        {
            threadID: threadID,
            threadTitle: req.body.title,
            pagename: sanitiseHtml(title, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}),
            isOpen: true
        }
    )
    await dbs['threadcomment'].create(
        {
            type: 'comment',
            threadID: threadID,
            doneBy: req.session.username || req.ipAddress,
            content: req.body.comment,
            isHidden: false
        }
    )
    await dbs['recentdiscuss'].create(
        {
            threadname: req.body.title,
            threadID: threadID,
            pagename: title
        }
    )
    res.redirect('/thread/' + threadID)
}
