const paths = require('../utils/paths')

module.exports = async (req, res, perm, protect, pages, history, rc, _block) =>
{
    //todo: RC
    //todo: add support for REVISION
    const username = req.session.username

    const permsACL = await perm.findAll({where: {username: username}})
    var r = false
    permsACL.forEach((v) =>
    {
        r = r || (v.perm == 'acl')
    })
    if (r)
    {
        //do nothing
    }
    else
    {
        require(paths.utils('error'))(req, res, { description: 'You need ACL permission.', returnLink: '/', returnName: 'the main page' })
    }

    const pg = await pages.findOne({where: {title: req.params.name}})
    if (pg === undefined)
    {
        require(paths.utils('error'))(req, res, { description: 'No such page.', returnLink: '/', returnName: 'the main page' })
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
