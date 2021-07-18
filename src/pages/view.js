module.exports = async (req, res, pages, history, protect, perm) =>
{
    //check read ACL
    req.params.name = req.params.name.trim()
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    var username = req.session.username
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, acl, perm)
    if (r)
    {
        //do nothing
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        require(global.path + '/error.js')(req, res, username, 'You cannot view because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }

    var rev = req.query.rev
    if (rev === undefined)
    {
        //get the newest ver.
        await pages.findOne({where: {title: req.params.name}}).then(async page =>
        {
            if (page) //if page exists
            {
                //show the page
                const redirect = req.query.redirect === undefined ? true : (req.query.redirect == 'true')
                const content = await require(global.path + '/pages/render.js')(req.params.name, page.content, true, pages, req, res, redirect)
                if (content === undefined) return
                res.render('outline',
                {
                    title: page.title,
                    content: content,
                    isPage: true,
                    pagename: page.title,
                    username: req.session.username,
                    wikiname: global.appname
                })
            }
            else
            {
                //404!
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', code=404)
            }
        })
    }
    else
    {
        //get the nth revision
        await history.findOne(
        {
            where:
            {
                page: req.params.name,
                rev: rev
            }
        }
        ).then(async page =>
        {
            if (page)
            {
                //show the page
                const redirect = req.query.redirect === undefined ? true : (req.query.redirect == 'true')
                //(pagename, data, renderInclude, pages = undefined, req = undefined, res = undefined, redirect = true, incl=true, args={})
                const content = await require(global.path + '/pages/render.js')(req.params.name, page.content, true, pages, req, res, redirect)
                if (content === undefined) return
                res.render('outline',
                {
                    title: page.page + ' (r' + rev +')',
                    content: content,
                    isPage: true,
                    pagename: page.page,
                    username: req.session.username,
                    wikiname: global.appname
                })
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', code=404)
            }
        })
    }
}