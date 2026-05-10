import date from 'date-and-time'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const isopen = req.query.isopen !== 'false'
    const filteredCh = await req.app.locals.services.recentDiscuss.getRecentDiscuss(isopen)

    await renderTemplateInLayout(req, res, 'threads/RecentDiscuss.ejs',
        { changes: filteredCh, date },
        { title: res.__('recentDiscuss'), isPage: false }
    )
}
