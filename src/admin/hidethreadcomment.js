import logger from '../utils/logger.js'
import renderError from '../utils/error.js'
import renderInfo from '../info.js'

export default async (req, res, dbs = {}) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await dbs['perm'].findOne({where: {username: username, perm: 'thread'}})))
    {
        logger.admin('Unauthorised thread action', username, { ip: req.ipAddress })
        renderError(req, res, { description: 'You do not have a thread permission', returnLink: '/admin', returnName: 'the admin page' })
        return
    }

    //find Thread
    const t = await dbs['threadcomment'].findOne(
    {
        where: {
            'threadID': req.body.threadid
        },
        order:
        [
            ['createdAt', 'ASC']
        ],
        offset: req.body.threadNo - 1,
    })
    if (!t)
    {
        renderError(req, res, { description: 'No such comment.', returnLink: 'javascript:window.history.back()', returnName: 'the thread.' })
        return
    }
    
    let unhide = false
    if (req.body.unhide) unhide = true

    await t.update({isHidden: !unhide})

    renderInfo(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}
