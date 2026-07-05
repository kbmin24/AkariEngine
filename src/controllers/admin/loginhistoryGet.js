import date from 'date-and-time'

export default async (req, res) => {
    const username = req.session.username

    if (req.query.user) {
        const records = await req.app.locals.services.loginHistory.getLoginHistoryForUser(req.query.user, { viewedBy: username })
        return res.json({
            user: req.query.user,
            records: records.map(r => ({ ...r, date: date.format(new Date(r.createdAt), global.dtFormat) }))
        })
    }

    res.json({ selectUser: true })
}
