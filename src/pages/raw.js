module.exports = async (req, res, pages, history, protect, perm, block) =>
{
    //check read ACL
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    var username = req.session.username
    let ACLList = [acl]
    var rev = req.query.rev
    if (rev)
    {
        const proRev = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev}})
        if (proRev)
        {
            ACLList.push(proRev.protectionLevel)
        }
    }
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, ACLList, perm, block)
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

    if (rev === undefined)
    {
        pages.findOne({where: {title: req.params.name}}).then(page =>
        {
            if (page) //if page exists
            {
                res.setHeader('content-type', 'text/plain')
                res.send(page.content)
            }
            else
            {
                //404!
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
            }
        })
    }
    else
    {
        //get the nth revision
        history.findOne(
            {
                where:
                {
                    page: req.params.name,
                    rev: rev
                }
            }
            ).then(page =>
            {
                if (page)
                {
                    res.setHeader('content-type', 'text/plain')
                    res.send(page.content)
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
                }
            })
    }
}