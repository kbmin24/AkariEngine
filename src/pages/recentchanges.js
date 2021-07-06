const ejs = require('ejs')
const updRecentChanges = require('./updRecentChanges')
module.exports = (req, res, recentchanges) =>
{
    recentchanges.findAndCountAll(
    {
        order:
        [
            ['id', 'DESC']
        ]
    }).then( changes =>
    {
        var show = req.query.show
        if(show === undefined)
        {
            show = 999999 //we can treat this as INF
        }
        show = (show > changes.count ? changes.count : show)
        ejs.renderFile(global.path + '/views/pages/recentchanges.ejs',{changes: changes.rows, show: show}, (err, html) => 
        {
            updRecentChanges(req, res, recentchanges)
            const username = req.session.username
            res.render('outline',
            {
                title: 'RecentChanges',
                content: html,
                username: username,
                wikiname: global.appname
            })
        })
    })
}