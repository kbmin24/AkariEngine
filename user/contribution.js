const ejs = require('ejs')
const date = require('date-and-time')
const paths = require('../utils/paths')
module.exports = async (req, res, history) =>
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
    require('../view.js')(req, res,
    {
        title: `${name}의 기여 목록`,
        content: html        
    })
}
