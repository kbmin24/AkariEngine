const ejs = require('ejs')
const i18n = require("i18n")
const paths = require('../../utils/paths')
const { renderLayout, load } = require(paths.util('httpHelper'))
const {
    ValidationError
} = require(paths.resolve('services', 'errors.js'))

module.exports = async (req, res) => {
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
            l: i18n.__,
            csrfToken: req.csrfToken(),
            disabled: editModel.disabled
        }

        if (editModel.needsCaptcha) {
            templateData.captcha = await require(paths.util('captcha')).genCaptcha()
        } else {
            templateData.captcha = ''
        }

        const html = await ejs.renderFile(paths.view('pages/edit.ejs'), templateData)
        renderLayout(req, res, {
            title: i18n.__('edit_pg', { name: req.params.name }),
            content: html,
            isPage: true,
            pageMode: editModel.disabled ? undefined : 'edit',
            notification: editModel.notification,
            pagename: req.params.name
        })
    } catch (error) {
        if (error instanceof ValidationError && error.i18nKey) {
            load('error.js')(req, res, {
                description: i18n.__(error.i18nKey),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: error.statusCode || 200
            })
            return
        }
        throw error
    }
}
