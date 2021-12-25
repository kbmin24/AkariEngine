const ejs = require('ejs')
module.exports = async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block
    const roomId = req.params.name

    let t = await dbs['thread'].findOne({where: {threadID: roomId}})

    let isAdmin = false
    if (req.session.username)
    {
        if (await dbs['perm'].findOne({where: {username: req.session.username, perm: 'thread'}}))
        {
            isAdmin = true
        }
    }
    if (!t)
    {
        require(global.path + '/error.js')(req, res, null, 'No such thread.', '/', 'the main page', 404)
        return
    }
    ejs.renderFile(global.path + '/views/threads/thread.ejs',
    {
        roomId: roomId,
        username: req.session.username || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        isAdmin: isAdmin,
        username: req.session.username,
        csrfToken: req.csrfToken()
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: `Discussion of ${t.pagename} - ${t.threadTitle}`,
            content: html,
            isPage: true,
            pagename: t.pagename,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}