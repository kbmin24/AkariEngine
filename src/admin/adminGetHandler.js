const ejs = require('ejs')
module.exports = (req, res, users, perm) =>
{
    const username = req.session.username
    switch (req.params.name)
    {
        case 'grant':
            if (username === undefined)
            {
                require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
                return
            }
            perm.findOne({where: {username: username, perm: 'grant'}}).then(p =>
            {
                if (p)
                {
                    if (req.query.grantTo === undefined)
                    {
                        ejs.renderFile(global.path + '/views/admin/grantName.ejs',
                        {},
                        (err, html) => 
                        {
                            res.render('outline',
                            {
                                title: 'Select username to grant to',
                                content: html,
                                username: username,
                                wikiname: global.appname
                            })
                        })
                        return
                    }
                    else
                    {
                        //verify that the username actually exists and fetch existing perms
                        users.findOne({where: {username: req.query.grantTo}}).then(u =>
                        {
                            if (u)
                            {
                                //fetch existing perms
                                perm.findAll({where: {username: req.query.grantTo}}).then(permissions =>
                                {
                                    ejs.renderFile(global.path + '/views/admin/grant.ejs',
                                    {
                                        grantTo: req.query.grantTo,
                                        perms: JSON.stringify(permissions)
                                    },
                                    (err, html) => 
                                    {
                                        res.render('outline',
                                        {
                                            title: 'Grant to ' + req.query.grantTo,
                                            content: html,
                                            username: username,
                                            wikiname: global.appname
                                        })
                                    })
                                })
                            }
                            else
                            {
                                //no such user.
                                require(global.path + '/error.js')(req, res, null, 'No such user.', '/admin/grant', 'the grant page')
                                return
                            }
                        })
                    }
                    return
                }
                else
                {
                    //Unauthorised access
                    console.log('[ADMIN] Unauthorised grant attempt: ' + username)
                    require(global.path + '/error.js')(req, res, null, 'You do not have a grant permission', '/admin', 'the admin page')
                    return
                }
            })
            return
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}