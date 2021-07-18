const ejs = require('ejs')
module.exports = async (req, res, perm, protect) =>
{
    const username = req.session.username
    const permsPresent = await protect.findAll({where: {title: req.params.name}})
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, 'acl', perm, autoredirect=false)
    ejs.renderFile(global.path + '/views/admin/protect.ejs', {title: req.params.name, hasACL: r, perms: JSON.stringify(permsPresent)}, (err, html) => 
    {
        res.render('outline',
        {
            title: 'Protect ' + req.params.name,
            content: html,
            username: username,
            wikiname: global.appname
        })
    })
}