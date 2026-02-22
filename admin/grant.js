const logger = require('../utils/logger.js')

module.exports = (req, res, users, perm, adminlog) =>
{
    const username = req.session.username
    const grantTo = req.body.grantTo
    if (username === undefined)
    {
        require('../utils/error.js')(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
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
                require('../utils/error.js')(req, res, { description: 'Please specify username to grant to.', returnLink: '/admin/grant', returnName: 'grant page' })
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
                    logger.admin('Permissions granted', username, { grantTo, permissions: permsLst.trim() })
                    //res.write('<script>alert("Successfully finished granting. Returning to the admin page.");window.location.href = "/admin";</script>')
                    })
                }
                else
                {
                    require('../utils/error.js')(req, res, { description: 'No such user.', returnLink: '/admin', returnName: 'the admin page' })
                }
            })
        }
        else
        {
            //Unauthorised access
            logger.admin('Unauthorised grant attempt', username, { ip: req.ipAddress })
            require('../utils/error.js')(req, res, { description: 'You do not have a grant permission', returnLink: '/admin', returnName: 'the admin page' })
            return
        }
    })
    require('../info.js')(req, res, null, 'Done.', '/admin', 'the admin page')
}
