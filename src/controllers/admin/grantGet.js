import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    if (req.query.grantTo === undefined) {
        renderTemplateInLayout(req, res, 'admin/grantName.ejs', {}, {
            title: res.__('selectUsernameToGrantTo')
        })
        return
    }

    const permissions = await req.app.locals.services.permission.findAllPermissions(req.query.grantTo)

    renderTemplateInLayout(req, res, 'admin/grant.ejs', {
        grantTo: req.query.grantTo,
        perms: JSON.stringify(permissions),
        csrfToken: req.csrfToken()
    }, {
        title: res.__('grantTo', { username: req.query.grantTo }),
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}