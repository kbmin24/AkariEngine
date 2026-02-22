const i18n = require("i18n")
const {
    ValidationError
} = require('../../services/errors.js')

module.exports = async (req, res) => {
    try {
        await req.app.locals.services.page.editPage({
            title: req.params.name,
            content: req.body.content,
            req,
            editPrefix: req.body.editPrefix || '',
            editSuffix: req.body.editSuffix || '',
            user: req.session.username,
            ipAddress: req.ipAddress,
            comment: req.body.comment
        })
        res.redirect(`/w/${req.params.name}`)
    } catch (error) {
        if (error instanceof ValidationError && error.i18nKey === 'edit_titleneeded') {
            require('../../utils/error.js')(req, res, {
                description: i18n.__('edit_titleneeded'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 200
            })
            return
        }
        if (error instanceof ValidationError && error.i18nKey === 'pagename_illegalfile') {
            require('../../utils/error.js')(req, res, {
                description: i18n.__('pagename_illegalfile'),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 200
            })
            return
        }
        throw error
    }
}
