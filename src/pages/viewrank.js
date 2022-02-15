
let ejs = require('ejs')
module.exports = async (req, res, viewcount) =>
{
    let rank = await viewcount.findAll(
        {
            limit: 30,
            order:
            [
                ['count', 'DESC']
            ],
        }
    )
    const html = await ejs.renderFile(global.path + '/views/pages/viewcount.ejs',
    {
        rank: rank
    })
    require(global.path + '/view.js')(req, res,
    {
        title: '오늘의 문서 조회수 랭킹',
        content: html,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })
}