import date from 'date-and-time'
import config from '../../config/index.js'

export default async (req, res) => {
    const isopen = req.query.isopen !== 'false'
    const changes = await req.app.locals.services.recentDiscuss.getRecentDiscuss(isopen)

    res.json({
        changes: changes.map(c => ({ ...c.toJSON(), date: date.format(new Date(c.updatedAt || c.createdAt), config.dateTimeFormat) })),
        isopen
    })
}
