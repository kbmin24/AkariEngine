import ejs from 'ejs'
import i18n from 'i18n'
import paths from '../utils/paths.js'
import renderView from '../view.js'

export default async (req, res, perm, protect, _block) =>
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
    ejs.renderFile(paths.view('admin/protect.ejs'), {title: req.params.name, hasACL: r, perms: JSON.stringify(permsPresent)}, (err, html) => 
    {
        renderView(req, res,
        {
            title: i18n.__('protectPage', {page: req.params.name}),
            content: html,
            isPage: true,
            pageMode: "protect",
            pagename: req.params.name,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
}
