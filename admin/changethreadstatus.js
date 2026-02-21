const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))

module.exports = async (req, res, dbs = {}) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await dbs['perm'].findOne({where: {username: username, perm: 'thread'}})))
    {
        logger.admin('Unauthorised thread attempt', username, { ip: req.ipAddress })
        require(paths.resolve('error.js'))(req, res, { description: 'You do not have a thread permission', returnLink: '/admin', returnName: 'the admin page' })
        return
    }

    //find Thread
    const t = await dbs['thread'].findOne(
    {
        where: {
            'threadID': req.body.threadid
        }
    })
    if (!t)
    {
        require(paths.resolve('error.js'))(req, res, { description: 'No such thread.', returnLink: 'javascript:window.history.back()', returnName: 'the thread.' })
        return
    }
    
    let close = false
    if (req.body.close) close = true

    await t.update({isOpen: !close})
    
    await dbs['threadcomment'].create(
        {
            type: close ? 'close' : 'open',
            threadID: req.body.threadid,
            doneBy: req.session.username,
            content: '',
            isHidden: false
        }
    )

    require(paths.resolve('info.js'))(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}
