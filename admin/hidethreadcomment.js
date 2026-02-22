const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))

module.exports = async (req, res, dbs = {}) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await dbs['perm'].findOne({where: {username: username, perm: 'thread'}})))
    {
        logger.admin('Unauthorised thread action', username, { ip: req.ipAddress })
        require(paths.utils('error'))(req, res, { description: 'You do not have a thread permission', returnLink: '/admin', returnName: 'the admin page' })
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
        require(paths.utils('error'))(req, res, { description: 'No such comment.', returnLink: 'javascript:window.history.back()', returnName: 'the thread.' })
        return
    }
    
    let unhide = false
    if (req.body.unhide) unhide = true

    await t.update({isHidden: !unhide})

    require(paths.resolve('info.js'))(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}
