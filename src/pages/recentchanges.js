const ejs = require('ejs')
module.exports = (req, res, recentchanges) =>
{
    recentchanges.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ]
    }).then( changes =>
    {
        ejs.renderFile(global.path + '/views/pages/recentchanges.ejs',{changes: changes}, (err, html) => 
        {
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