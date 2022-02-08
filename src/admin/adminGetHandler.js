const ejs = require('ejs')
const date = require('date-and-time')
const {Op} = require('sequelize')
module.exports = async (req, res, users, perm, loginhistory, adminlog) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
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
                                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
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
                                        perms: JSON.stringify(permissions),
                                        csrfToken: req.csrfToken()
                                    },
                                    (err, html) => 
                                    {
                                        if (err)
                                        {
                                            console.error(err)
                                            res.status(500).send('Internal Server Error')
                                            return
                                        }
                                        res.render('outline',
                                        {
                                            title: 'Grant to ' + req.query.grantTo,
                                            content: html,
                                            username: username,
                                            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
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
                    console.log('[ADMIN] Unauthorised grant attempt: ' + username + ' ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress))
                    require(global.path + '/error.js')(req, res, null, 'You do not have a grant permission.', '/admin', 'the admin page')
                    return
                }
            })
            return
        case 'blockuser':
            if (await perm.findOne({where: {username: username, perm: 'block'}}))
            {
                ejs.renderFile(global.path + '/views/admin/blockuser.ejs',{csrfToken: req.csrfToken()}, (err, html) => 
                {
                    if (err)
                    {
                        console.error(err)
                        res.writeHead(500).write('Internal Server Error')
                        return
                    }
                    res.render('outline',
                    {
                        title: 'Block user',
                        content: html,
                        username: username,
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                        wikiname: global.appname
                    })
                })
                //await require(global.path + '/sendfile.js')(req, res, 'Block User', '/views/admin/blockuser.html')
            }
            else
            {
                console.log('[ADMIN] Unauthorised block attempt: ' + username + ' ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress))
                require(global.path + '/error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
            }
            return
        case 'blockip':
            if (await perm.findOne({where: {username: username, perm: 'block'}}))
            {
                //csrfToken: req.csrfToken()
                ejs.renderFile(global.path + '/views/admin/blockIP.ejs',{csrfToken: req.csrfToken()}, (err, html) => 
                {
                    if (err)
                    {
                        console.error(err)
                        res.writeHead(500).write('Internal Server Error')
                        return
                    }
                    res.render('outline',
                    {
                        title: 'Block IP address',
                        content: html,
                        username: username,
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                        wikiname: global.appname
                    })
                })
                //await require(global.path + '/sendfile.js')(req, res, 'Block IP address', '/views/admin/blockIP.html')
            }
            else
            {
                console.log('[ADMIN] Unauthorised block attempt: ' + username + ' ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress))
                require(global.path + '/error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
            }
            return
        case 'loginhistory':
        {
            const p = await perm.findOne({where: {username: username, perm: 'loginhistory'}})
            if (p)
            {
                if (req.query.user)
                {
                    //Remove old ones
                    await loginhistory.destroy(
                        {
                            where: {
                                createdAt: {[Op.lt]: (new Date() - 7257600000)} //12 weeks = 7257600000ms
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
                    const lgIns = await loginhistory.findAll({where: {username: req.query.user}, order: [['createdAt', 'DESC']]})
                    const lgInHTML = await ejs.renderFile(global.path + '/views/admin/loginhistory.ejs', {records: lgIns, date: date})
                    res.render('outline',
                    {
                        title: 'Login history of ' + req.query.user,
                        content: lgInHTML,
                        username: username,
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
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
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                        wikiname: global.appname
                    })
                    return
                }
            }
            else
            {
                //Unauthorised access
                console.log('[ADMIN] Unauthorised loginhistory attempt: ' + username + ' ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress))
                require(global.path + '/error.js')(req, res, null, 'You do not have a loginhistory permission.', '/admin', 'the admin page')
                return
            }
        }
        case 'hiderev':
            {
                const p = await perm.findOne({where: {username: username, perm: 'acl'}})
                if (p)
                {
                    //give form
                    const html = await ejs.renderFile(global.path + '/views/admin/hiderev.ejs', {csrfToken: req.csrfToken()})
                    res.render('outline',
                    {
                        title: 'Hide specific revision of a page',
                        content: html,
                        username: username,
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                        wikiname: global.appname
                    })
                }
                else
                {
                    console.log('[ADMIN] Unauthorised rev hide attempt: ' + username + ' ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress))
                    require(global.path + '/error.js')(req, res, null, 'You do not have an acl permission.', '/admin', 'the admin page')
                }
                return
            }
        case 'gongji':
            {
                const p = await perm.findOne({where: {username: username, perm: 'board'}})
                if (p)
                {
                    //give form
                    const html = await ejs.renderFile(global.path + '/views/admin/gongji.ejs', {csrfToken: req.csrfToken()})
                    res.render('outline',
                    {
                        title: '게시판 공지 변경',
                        content: html,
                        username: username,
                        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                        wikiname: global.appname
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'You do not have a board permission.', '/admin', 'the admin page')
                }
                return
            }

        default:
        res.writeHead(404)
        res.write('404 Not Found')
        return
    }
}