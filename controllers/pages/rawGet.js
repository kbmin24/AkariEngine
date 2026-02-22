const i18n = require('i18n')
const paths = require('../../utils/paths')
const {
    PageNotFoundError,
    ValidationError
} = require(paths.service('errors'))

module.exports = async (req, res) => {
    try {
        const content = await req.app.locals.services.page.getRawContent({
            title: req.params.name,
            rev: req.query.rev
        })

        res.setHeader('content-type', 'text/plain')
        res.send(content)
    } catch (error) {
        if (error instanceof PageNotFoundError) {
            require(paths.utils('error'))(req, res, {
                description: i18n.__('noPageMsg', { name: req.params.name }),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: 404
            })
            return
        }

        if (error instanceof ValidationError && error.i18nKey) {
            require(paths.utils('error'))(req, res, {
                description: i18n.__(error.i18nKey),
                returnLink: '/',
                returnName: i18n.__('mainpage'),
                statusCode: error.statusCode || 400
            })
            return
        }

        throw error
    }
}
