module.exports = (req, res, users, perm, adminlog) =>
{
    const username = req.session.username
    const grantTo = req.body.grantTo
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
        return
    }
    perm.findOne({where: {username: username, perm: 'grant'}}).then(p =>
    {
        if (p)
        {
            //check if the user exists (the one to grant to)
            if (grantTo === undefined)
            {
                //Error!
                require(global.path + '/error.js')(req, res, null, 'Please specify username to grant to.', '/admin/grant', 'grant page')
                return
            }
            //does the username even exist?
            users.findOne({where: {username: grantTo}}).then(u =>
            {
                if (u)
                {
                    // eslint-disable-next-line no-unused-vars
                    perm.destroy({where: {username: grantTo}}).then(res => //Clear up existing permissions
                    {
                        //give out permissions
                        for (let k in req.body)
                        {
                            if (k == 'grantTo') continue
                            perm.create(
                            {
                                username: grantTo,
                                perm: k,
                                givenby: username
                            })
                        }
                    //print DONE message
                    let permsLst = ''
                    for (let i in req.body)
                    {
                        if (i == 'grantTo' || i == '_csrf') continue
                        permsLst += i + ' '
                    }
                    adminlog.create({
                        username: username,
                        job: `granted to ${grantTo}: ${permsLst}`
                    })
                    console.log(`[ADMIN] ${username} granted to ${grantTo}: ${permsLst}`)
                    //res.write('<script>alert("Successfully finished granting. Returning to the admin page.");window.location.href = "/admin";</script>')
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'No such user.', '/admin', 'the admin page')
                }
            })
        }
        else
        {
            //Unauthorised access
            console.log('[ADMIN] Unauthorised grant attempt: ' + username)
            require(global.path + '/error.js')(req, res, null, 'You do not have a grant permission', '/admin', 'the admin page')
            return
        }
    })
    require(global.path + '/info.js')(req, res, null, 'Done.', '/admin', 'the admin page')
}