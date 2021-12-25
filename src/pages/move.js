module.exports = async (req, res, username, users, pages, recentchanges, history, thread, perm, block, protect) =>
{
    if (!(await require(global.path + '/tools/captcha.js').chkCaptcha(req, res, perm))) return

    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'move'}})
    var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block)
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
        require(global.path + '/error.js')(req, res, username, 'You cannot move because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }
    pages.findOne({where: {title: req.body.newName}}).then(async oldpage =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        if (oldpage) //if page exists
        {
            require(global.path + '/error.js')(req, res, null, 'Cannot move the page because the page with the name already exists.', '/', 'the main page')
        }
        else
        {
            pages.findOne({where: {title: req.params.name}}).then(async page =>
            {
                //move protects
                let ps = await protect.findAll({where: {title: req.params.name}})
                ps.forEach(async v =>
                    {
                        v.update({title: req.body.newName})
                    })
                page.update({title: req.body.newName, currentRev: page.currentRev + 1})
                .then(() =>
                {
                    //create redirect
                    let redrPageContent = `#redirect ${req.body.newName}`
                    pages.create(
                    {
                        title: req.params.name,
                        content: redrPageContent,
                        currentRev: 1
                    })
                    history.create(
                    {
                        page: req.params.name,
                        rev: 1,
                        content: redrPageContent,
                        bytechange: redrPageContent.length,
                        editedby: doneby,
                        comment: `Auto-created redirect due to page move`,
                        type: 'create'
                    })
                    recentchanges.create(
                    {
                        page: req.params.name,
                        rev: 1,
                        doneBy: doneby,
                        comment: `Auto-created redirect due to page move`,
                        bytechange: redrPageContent.length,
                        type: 'create'
                    })
                    
                    //deal with the main page
                    recentchanges.create(
                    {
                        page: req.body.newName,
                        rev: page.currentRev,
                        doneBy: doneby,
                        bytechange: 0,
                        comment: 'Moved ' + req.params.name + ' to ' + req.body.newName,
                        type: 'move'
                    })
                    history.findAll({where: {page: req.params.name}}).then(oldhistories =>
                    {
                        for (var i = 0; i < oldhistories.length; i++)
                        {
                            oldhistories[i].update(
                            {
                                page: req.body.newName
                            })
                        }
                    })
                    thread.findAll({where: {pagename: req.params.name}}).then(oldthreads =>
                        {
                            oldthreads.forEach(o =>
                                {
                                    o.update({pagename: req.body.newName})
                                })
                        })
                    history.create(
                    {
                        page: req.body.newName,
                        rev: page.currentRev,
                        content: page.content,
                        bytechange: 0,
                        editedby: doneby,
                        movedFrom: req.params.name,
                        movedTo: req.body.newName,
                        comment: 'Moved ' + req.params.name + ' to ' + req.body.newName,
                        type: 'move'
                    })
                    res.redirect('/w/' + req.body.newName)
                })
            })
        }
    })
}