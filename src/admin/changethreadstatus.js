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
    const t = await dbs['thread'].findOne(
    {
        where: {
            'threadID': req.body.threadid
        }
    })
    if (!t)
    {
        require(global.path + '/error.js')(req, res, null, 'No such thread.', 'javascript:window.history.back()', 'the thread.')
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

    require(global.path + '/info.js')(req, res, null, 'Done.', 'javascript:window.history.back()', 'the thread')
}