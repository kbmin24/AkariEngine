import ejs from 'ejs'
import date from 'date-and-time'
import paths from '../utils/paths.js'
import renderView from '../view.js'

export default async (req, res, history) =>
{
    let name = req.params.name || ''
    let showfrom = req.query.from || 0
    const l = await history.findAndCountAll(
        {
            where: {
                editedBy: name
            },
            order:
            [
                ['createdAt', 'DESC']
            ],
            limit: 100,
            offset: showfrom * 1
        }
    )
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
        title: `${name}의 기여 목록`,
        content: html        
    })
}
