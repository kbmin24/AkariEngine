import date from 'date-and-time'

export default async (req, res) => {
    const model = await req.app.locals.services.history.getHistoryViewModel({
        title: req.params.name,
        from: req.query.from,
        to: req.query.to,
        user: req.session.username,
        ipAddress: req.ipAddress
    })

    res.json({
        title: model.title,
        pagename: req.params.name,
        changes: model.changes.map(c => ({ ...c, date: date.format(new Date(c.updatedAt || c.createdAt), global.dtFormat) })),
        from: model.from,
        to: model.to,
        historyCount: model.historyCount,
        pgSize: model.pgSize
    })
}
