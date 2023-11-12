const ejs = require('ejs')
module.exports = async (req, res, perm, protect, block) =>
{
    const username = req.session.username
    const permsPresent = await protect.findAll({where: {title: req.params.name}})
    var r = false
    if (username)
    {
        const permsACL = await perm.findAll({where: {username: username}})
        permsACL.forEach((v) =>
        {
            r = r || (v.perm == 'acl')
        })
    }
    ejs.renderFile(global.path + '/views/admin/protect.ejs', {title: req.params.name, hasACL: r, perms: JSON.stringify(permsPresent)}, (err, html) => 
    {
        require(global.path + '/view.js')(req, res,
        {
            title: req.params.name + ' 보호',
            content: html,
            isPage: true,
            pageMode: "protect",
            pagename: req.params.name,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
}