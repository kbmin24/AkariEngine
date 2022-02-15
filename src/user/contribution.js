const ejs = require('ejs')
const date = require('date-and-time')
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
    const html = await ejs.renderFile(global.path + '/views/user/contributions.ejs',
    {
        contributions: l.rows,
        count: l.count,
        username: name,
        from: showfrom,
        date: date
    })
    require(global.path + '/view.js')(req, res,
    {
        title: `${name}의 기여 목록`,
        content: html,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })
}