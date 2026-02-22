const logger = require('../utils/logger.js')

module.exports = async (req, res, dbs = {}) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await dbs['perm'].findOne({where: {username: username, perm: 'thread'}})))
    {
        logger.admin('Unauthorised thread attempt', username, { ip: req.ipAddress })
        require('../utils/error.js')(req, res, { description: 'You do not have a thread permission', returnLink: '/admin', returnName: 'the admin page' })
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
        require('../utils/error.js')(req, res, { description: 'No such thread.', returnLink: 'javascript:window.history.back()', returnName: 'the thread.' })
        return
    }

    await t.update({threadTitle: req.body.newtitle})

    await dbs['threadcomment'].create(
        {
            type: 'changetitle',
            threadID: req.body.threadid,
            doneBy: req.session.username,
            content: req.body.newtitle,
            isHidden: false
        }
    )

    require('../info.js')(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}
