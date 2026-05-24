import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    await renderTemplateInLayout(req, res, 'admin/hiderev.ejs', { csrfToken: req.csrfToken() }, {
        title: res.__('hiderev'),
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}
