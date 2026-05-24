import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) =>
{
    const username = req.session.username
    const { repositories, services } = req.app.locals
    const permsPresent = await repositories.protections.findAllByTitle(req.params.name)

    const hasAcl = username
        ? await services.permission.hasPermission(username, 'acl')
        : false

    await renderTemplateInLayout(req, res, 'admin/protect.ejs', {
        title: req.params.name,
        hasACL: hasAcl,
        perms: JSON.stringify(permsPresent)
    }, {
        title: res.__('protectPage', { page: req.params.name }),
        isPage: true,
        pageMode: 'protect',
        pagename: req.params.name,
    })
}
