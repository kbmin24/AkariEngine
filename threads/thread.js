import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderError from '../utils/error.js'
import renderView from '../view.js'

export default async (req, res, dbs = {}) =>
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
        renderError(req, res, { description: 'No such thread.', returnLink: '/', returnName: 'the main page', statusCode: 404 })
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
        renderView(req, res,
        {
            title: `${t.pagename} 토론 - ${t.threadTitle}`,
            content: html,
            isPage: true,
            pageMode: "threads",
            pagename: t.pagename
            
        })
    })
}
