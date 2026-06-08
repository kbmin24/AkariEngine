import { genCaptcha } from '../../utils/captcha.js'

export default async (req, res) => {
    const editModel = await req.app.locals.services.page.getEditViewModel({
        title: req.params.name,
        section: req.query.section,
        aclState: req.editAcl,
        username: req.session.username
    })

    res.json({
        title: editModel.title,
        content: editModel.content,
        prefix: editModel.prefix,
        suffix: editModel.suffix,
        username: editModel.username,
        disabled: editModel.disabled,
        notification: editModel.notification,
        pagename: req.params.name,
        captcha: editModel.needsCaptcha ? await genCaptcha() : null
    })
}
