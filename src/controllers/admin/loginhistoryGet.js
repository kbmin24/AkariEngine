import date from 'date-and-time'
import { renderTemplateInLayout } from '../../utils/httpHelper.js'

export default async (req, res) => {
    const username = req.session.username

    if (req.query.user) {
        const records = await req.app.locals.services.loginHistory.getLoginHistoryForUser(req.query.user, { viewedBy: username })
        await renderTemplateInLayout(req, res, 'admin/loginhistory.ejs', { records, date }, {
            title: res.__('loginHistoryOf', { username: req.query.user })
        })
        return
    }

    await renderTemplateInLayout(req, res, 'admin/loginhistoryName.ejs', {}, {
        title: res.__('loginHistoryUsernameSelect')
    })
}
