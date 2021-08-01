
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
    res.render('outline',
    {
        title: 'Most viewed pages of the day',
        content: html,
        username: req.session.username,
        wikiname: global.appname
    })
}