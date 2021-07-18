const ejs = require('ejs')
module.exports = (req, res, pages) =>
{
    pages.findAndCountAll(
    {
        order:
        [
            ['title', 'ASC']
        ]
    }).then( pagelist =>
    {
        ejs.renderFile(global.path + '/views/pages/pagelist.ejs',{pages: pagelist.rows, count: pagelist.count}, (err, html) => 
        {
            const username = req.session.username
            res.render('outline',
            {
                title: 'PageList',
                content: html,
                username: username,
                wikiname: global.appname
            })
        })
    })
}