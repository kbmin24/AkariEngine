const ejs = require('ejs')
module.exports = async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block

    const title = req.params.name

    //block
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, ['everyone'], null, dbs['block'], true, true)

    //First check whether the page exists
    if (!(await dbs['pages'].findOne({where: {title: title}})))
    {
        require(global.path + '/error.js')(req, res, null, 'No such thread.', '/', 'the main page', code=404)
        return
    }

    let openThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: true}})
    let closedThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: false}})

    let captcha = await require(global.path + '/tools/captcha.js').genCaptcha(req)

    ejs.renderFile(global.path + '/views/threads/threadlist.ejs',
    {
        pagename: title,
        captcha: captcha,
        openThreads: openThreads,
        closedThreads: closedThreads,
        r: r
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: `${title}의 토론`,
            content: html,
            isPage: true,
            pagename: title,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}