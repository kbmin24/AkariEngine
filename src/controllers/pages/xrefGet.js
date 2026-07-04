import { ValidationError } from '../../services/errors.js'

export default async (req, res) => {
    try {
        const model = await req.app.locals.services.page.getXrefViewModel({
            title: req.params.name,
            from: req.query.from,
            to: req.query.to
        })

        res.json({
            title: model.title,
            entries: model.entries,
            count: model.count,
            from: model.from,
            to: model.to,
            pgSize: model.pgSize,
            pagename: model.title
        })
    } catch (error) {
        if (error instanceof ValidationError) throw error
        throw error
    }
}
