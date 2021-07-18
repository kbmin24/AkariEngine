//http://localhost:8080/revert/FrontPage?rev=29
module.exports = async (req, res, username, users, pages, recentchanges, history, protect, perm) =>
{
    //username parameter: reserved for history
    //todo: ACL
    
    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
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
        require(global.path + '/error.js')(req, res, username, 'You cannot edit because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }
    pages.findOne({where: {title: decodeURI(decodeURI(req.params.name))}}).then(page =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        if (page) //if page exists
        {
            const oldLength = page.content.length
            var oldcontent = undefined
            history.findOne({where: {page: decodeURI(req.params.name), rev: req.query.rev}}).then(oldrev =>
            {
                if (oldrev === undefined)
                {
                    require(global.path + '/error.js')(req, res, null, 'No such revision.', '/', 'the main page')
                }
                else
                {
                    oldcontent = oldrev.content
                    page.update({content: oldcontent, currentRev: page.currentRev + 1})
                    .then(() =>
                    {
                        recentchanges.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            doneBy: doneby,
                            bytechange: page.content.length - oldLength,
                            comment: 'Reverted to r' + req.query.rev,
                            type: 'revert'
                        })
                        history.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            content: page.content,
                            bytechange: page.content.length - oldLength,
                            editedby: doneby,
                            comment: 'Reverted to r' + req.query.rev,
                            revertTo: req.query.rev,
                            type: 'revert'
                        })
                        res.redirect('/w/' + decodeURI(req.params.name))
                    })
                }
            })
        }
        else
        {
            //error!
            console.log(decodeURI(req.params.name))
            require(global.path + '/error.js')(req, res, null, 'No such page.', '/', 'the main page')
        }
    })
}