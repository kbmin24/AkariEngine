import ejs from 'ejs'
import paths from '../../utils/paths.js'
import { renderLayout } from '../../utils/httpHelper.js'
import { ValidationError } from '../../services/errors.js'
import { genCaptcha } from '../../utils/captcha.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        const editModel = await req.app.locals.services.page.getEditViewModel({
            title: req.params.name,
            section: req.query.section,
            aclState: req.editAcl,
            username: req.session.username
        })

        const templateData = {
            title: editModel.title,
            content: editModel.content,
            prefix: editModel.prefix,
            suffix: editModel.suffix,
            username: editModel.username,
            l: res.__,
            csrfToken: req.csrfToken(),
            disabled: editModel.disabled
        }

        if (editModel.needsCaptcha) {
            templateData.captcha = await genCaptcha()
        } else {
            templateData.captcha = ''
        }

        const html = await ejs.renderFile(paths.view('pages/edit.ejs'), templateData)
        renderLayout(req, res, {
            title: res.__('edit_pg', { name: req.params.name }),
            content: html,
            isPage: true,
            pageMode: editModel.disabled ? undefined : 'edit',
            notification: editModel.notification,
            pagename: req.params.name
        })
    } catch (error) {
        if (error instanceof ValidationError && error.i18nKey) {
            renderError(req, res, {
                description: res.__(error.i18nKey),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: error.statusCode || 200
            })
            return
        }
        throw error
    }
}
