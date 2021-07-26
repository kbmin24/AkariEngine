module.exports = async (req, res, username, users, pages, recentchanges, history, perm, block, protect) =>
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
    //todo: ACL
    pages.findOne({where: {title: req.body.newName}}).then(oldpage =>
    {
        var doneby = req.session.username
        if (doneby === undefined) req.headers['x-forwarded-for'] || req.socket.remoteAddress
        if (oldpage) //if page exists
        {
            require(global.path + '/error.js')(req, res, null, 'Cannot move the page because the page with the name already exists.', '/', 'the main page')
        }
        else
        {
            pages.findOne({where: {title: req.params.name}}).then(page =>
            {
                page.update({title: req.body.newName, currentRev: page.currentRev + 1})
                .then(() =>
                {
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
                        console.log( req.params.name, oldhistories.length)
                        for (var i = 0; i < oldhistories.length; i++)
                        {
                            oldhistories[i].update(
                            {
                                page: req.body.newName
                            })
                        }
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