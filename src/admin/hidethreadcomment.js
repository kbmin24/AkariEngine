module.exports = async (req, res, dbs = {}) =>
{
    const username = req.session.username
    //first check whether the user has block permission or not
    if (!(await dbs['perm'].findOne({where: {username: username, perm: 'thread'}})))
    {
        console.log('[ADMIN] Unauthorised thread attempt: ' + username)
        require(global.path + '/error.js')(req, res, null, 'You do not have a thread permission', '/admin', 'the admin page')
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
        require(global.path + '/error.js')(req, res, null, 'No such comment.', 'javascript:window.history.back()', 'the thread.')
        return
    }
    
    let unhide = false
    if (req.body.unhide) unhide = true

    await t.update({isHidden: !unhide})

    require(global.path + '/info.js')(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}