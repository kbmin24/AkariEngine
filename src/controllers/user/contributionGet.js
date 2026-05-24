import ejs from 'ejs'
import date from 'date-and-time'
import paths from '../../utils/paths.js'
import renderView from '../../view.js'

export default async (req, res) =>
{
    let name = req.params.name || ''
    let showfrom = req.query.from || 0
    const l = await req.app.locals.services.history.getContributions(name, showfrom)
    const html = await ejs.renderFile(paths.view('user/contributions.ejs'),
    {
        contributions: l.rows,
        count: l.count,
        username: name,
        from: showfrom,
        date: date
    })
    renderView(req, res,
    {
        title: res.__('contribListOf', { user: name }),
        content: html        
    })
}
