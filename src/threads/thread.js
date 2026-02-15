const ejs = require('ejs')
const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
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
        require(paths.resolve('error.js'))(req, res, null, 'No such thread.', '/', 'the main page', 404)
        return
    }
    ejs.renderFile(paths.view('threads/thread.ejs'),
    {
        roomId: roomId,
        username: req.session.username || req.ipAddress,
        isAdmin: isAdmin,
        csrfToken: req.csrfToken()
    }, (err, html) => 
    {
        if (err)
        {
            logger.error('Thread page rendering failed', err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(paths.resolve('view.js'))(req, res,
        {
            title: `${t.pagename} 토론 - ${t.threadTitle}`,
            content: html,
            isPage: true,
            pageMode: "threads",
            pagename: t.pagename
            
        })
    })
}
