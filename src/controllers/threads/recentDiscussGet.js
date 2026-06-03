import date from 'date-and-time'

export default async (req, res) => {
    const isopen = req.query.isopen !== 'false'
    const changes = await req.app.locals.services.recentDiscuss.getRecentDiscuss(isopen)

    res.json({
        changes: changes.map(c => ({ ...c, date: date.format(new Date(c.updatedAt || c.createdAt), global.dtFormat) })),
        isopen
    })
}
