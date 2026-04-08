import date from 'date-and-time'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const username = req.session.username
    const showfrom = !isNaN(req.query.from) ? req.query.from : 0

    const { logs, count } = await req.app.locals.services.admin.getAdminLogAndCount({
        doneBy: username,
        job: req.query.job,
        offset: showfrom
    })
    await renderTemplateInLayout(req, res, 'admin/adminlog.ejs', {
        changes: logs,
        count: count,
        from: showfrom,
        doneBy: req.query.doneBy,
        job: req.query.job,
        date: date
    }, {
        title: 'Admin Log',
    })
}