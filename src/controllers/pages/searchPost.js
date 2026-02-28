import { ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        const target = await req.app.locals.services.search.resolveSearchRedirect({
            query: req.body.q ?? req.body.pagename
        })
        res.redirect(target)
    } catch (error) {
        if (error instanceof ValidationError) {
            res.status(error.statusCode || 400).send(error.message)
            return
        }
        throw error
    }
}
