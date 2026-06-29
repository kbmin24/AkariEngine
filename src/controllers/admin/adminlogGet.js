import date from 'date-and-time'

export default async (req, res) => {
    const showfrom = !isNaN(req.query.from) ? Number(req.query.from) : 0

    const { logs, count } = await req.app.locals.services.admin.getAdminLogAndCount({
        doneBy: req.query.doneBy,
        job: req.query.job,
        from: showfrom
    })

    res.json({
        logs: logs.map(l => ({ ...l, date: date.format(new Date(l.createdAt), global.dtFormat) })),
        count,
        from: showfrom,
        doneBy: req.query.doneBy || null,
        job: req.query.job || null
    })
}
