const ejs = require('ejs')
const date = require('date-and-time')
const {Op} = require('sequelize')
module.exports = async (req, res, users, perm, loginhistory, adminlog) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    switch (req.params.name)
    {
        case 'grant':
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
                    require(global.path + '/error.js')(req, res, null, 'You do not have a grant permission.', '/admin', 'the admin page')
                    return
                }
            })
            return
        case 'blockuser':
            if (await perm.findOne({where: {username: username, perm: 'block'}}))
            {
                await require(global.path + '/sendfile.js')(req, res, 'Block User', '/views/admin/blockuser.html')
            }
            else
            {
                console.log('[ADMIN] Unauthorised block attempt: ' + username)
                require(global.path + '/error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
            }
            return
        case 'blockip':
            if (await perm.findOne({where: {username: username, perm: 'block'}}))
            {
                await require(global.path + '/sendfile.js')(req, res, 'Block IP address', '/views/admin/blockIP.html')
            }
            else
            {
                console.log('[ADMIN] Unauthorised block attempt: ' + username)
                require(global.path + '/error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
            }
            return
        case 'loginhistory':
            const p = await perm.findOne({where: {username: username, perm: 'loginhistory'}})
            if (p)
            {
                if (req.query.user)
                {
                    //Remove old ones
                    await loginhistory.destroy(
                        {
                            where: {
                                createdAt: {[Op.lt]: (new Date() - 7257600000)} //12 weeks 7257600000
                            }
                        }
                    )
                    //create adminlog
                    adminlog.create(
                        {
                            username: username,
                            job: `viewed login history of ${req.query.user}`
                        }
                    )
                    const lgIns = await loginhistory.findAll({where: {username: req.query.user}})
                    const lgInHTML = await ejs.renderFile(global.path + '/views/admin/loginhistory.ejs', {records: lgIns, date: date})
                    res.render('outline',
                    {
                        title: 'Login history of ' + req.query.user,
                        content: lgInHTML,
                        username: username,
                        wikiname: global.appname
                    })
                    return
                }
                else
                {
                    const gr = await ejs.renderFile(global.path + '/views/admin/loginhistoryName.ejs', {})
                    res.render('outline',
                    {
                        title: 'Select username view login history',
                        content: gr,
                        username: username,
                        wikiname: global.appname
                    })
                    return
                }
            }
            else
            {
                //Unauthorised access
                console.log('[ADMIN] Unauthorised loginhistory attempt: ' + username)
                require(global.path + '/error.js')(req, res, null, 'You do not have a loginhistory permission.', '/admin', 'the admin page')
                return
            }
            return
        default:
        res.writeHead(404)
        res.write('404 Not Found')
        return
    }
}