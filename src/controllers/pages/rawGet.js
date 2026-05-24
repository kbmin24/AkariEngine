import { PageNotFoundError, ValidationError } from '../../services/errors.js'
import renderError from '../../utils/error.js'

export default async (req, res) => {
    try {
        const content = await req.app.locals.services.page.getRawContent({
            title: req.params.name,
            rev: req.query.rev,
            user: req.session.username,
            ipAddress: req.ipAddress
        })

        res.setHeader('content-type', 'text/plain')
        res.send(content)
    } catch (error) {
        if (error instanceof PageNotFoundError) {
            renderError(req, res, {
                description: res.__('noPageMsg', { name: req.params.name }),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: 404
            })
            return
        }

        if (error instanceof ValidationError && error.i18nKey) {
            renderError(req, res, {
                description: res.__(error.i18nKey),
                returnLink: '/',
                returnName: res.__('mainpage'),
                statusCode: error.statusCode || 400
            })
            return
        }

        throw error
    }
}
