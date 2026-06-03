import date from 'date-and-time'

export default async (req, res) => {
    const name = req.params.name || ''
    const showfrom = req.query.from || 0
    const l = await req.app.locals.services.history.getContributions(name, showfrom)

    res.json({
        username: name,
        contributions: l.rows.map(c => ({ ...c, date: date.format(new Date(c.updatedAt || c.createdAt), global.dtFormat) })),
        count: l.count,
        from: showfrom
    })
}
