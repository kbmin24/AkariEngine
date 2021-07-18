const ejs = require('ejs')
module.exports = async (req, res, perm, protect, pages, history, rc) =>
{
    //todo: RC
    //todo: add support for REVISION
    const username = req.session.username

    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, 'acl', perm)
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
        require(global.path + '/error.js')(req, res, username, 'You need ACL permission.', '/', 'the main page')
    }

    const pg = await pages.findOne({where: {title: req.params.name}})
    if (pg === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'No such page.', '/', 'the main page')
        return
    }
    await protect.destroy({where: {title: req.params.name}})
    for (const [k, v] of Object.entries(req.body))
    {
        await protect.create({
            title: req.params.name,
            task: k,
            protectionLevel: v
        })
    }
    await history.create({
        page: req.params.name,
        rev: pg.currentRev + 1,
        content: pg.content,
        bytechange: 0,
        editedby: username,
        type: 'protect',
        comment: JSON.stringify(req.body)
    })
    pg.update({currentRev: pg.currentRev + 1})
    await rc.create({
        page: req.params.name,
        rev: pg.currentRev,
        bytechange: 0,
        doneBy: username,
        type: 'protect',
        comment: JSON.stringify(req.body)
    })
    res.redirect('/w/'+req.params.name)
    return
}