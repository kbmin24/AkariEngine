module.exports = async (req, res, tables={}) =>
{
    const username = req.session.username
    const title = req.body.pagename
    const level = req.body.level
    if (isNaN(req.body.rev))
    {
        await require(global.path + '/error.js')(req, res, null, 'rev must be a number.', 'javascript:window.history.back()', 'the previous page')
        return
    }
    const rev = req.body.rev * 1
    if (!username)
    {
        await require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
        return
    }
    if (!(await tables['perm'].findOne({where:{username: username, perm: 'acl'}})))
    {
        await require(global.path + '/error.js')(req, res, null, 'You need ACL permission.', '/', 'the main page')
        return
    }

    const page = await tables['page'].findOne({where: {title: title}})
    if (!page)
    {
        await require(global.path + '/error.js')(req, res, null, 'No such page.', 'javascript:window.history.back()', 'the previous page')
        return
    }
    //ensure that that r actually exists
    //that is:
    //1 <= rev AND rev <= page.currentRev
    if (rev < 1 || page.currentRev < rev)
    {
        await require(global.path + '/error.js')(req, res, null, 'No such revision.', 'javascript:window.history.back()', 'the previous page')
        return
    }

    //destroy existing ACL
    await tables['protect'].destroy({where: {title: title, revision: rev}})
    await tables['protect'].create(
        {
            title: title,
            task: 'read',
            revision: rev,
            protectionLevel: level
        }
    )
    await tables['adminlog'].create(
        {
            username: username,
            job: `protected ${title} r${rev} to ${level}`
        }
    )
    require(global.path + '/info.js')(req, res, null, 'Done.', '/admin', 'the admin page')
}