const ejs = require('ejs')
const date = require('date-and-time')
const pgSize = 30
module.exports = (req, res, histories) =>
{
    histories.findAndCountAll(
    {
        where:
        {
            page: req.params.name
        }
        ,
        order:
        [
            ['id', 'DESC']
        ]
    }).then( changes =>
    {
        if (changes.count == 0)
        {
            require(global.path + '/error.js')(req, res, null, global.i18n.__('noPageMsg', {name: req.params.name}), '/', global.i18n.__('mainpage'), 404)
            return
        }
        //from & to is nth entry in history (NOT nth revision)
        var from = req.query.from
        var to = req.query.to
        if (from === undefined) from = 1
        if (from < 1) from = 1
        if (to === undefined) to = pgSize
        if (to > changes.count) to = changes.count
        ejs.renderFile(global.path + '/views/pages/histories.ejs',
        {
            l: global.i18n.__,
            changes: changes.rows,
            from: from,
            to: to,
            historycount: changes.count,
            title: req.params.name,
            pgSize: pgSize, //# of entries in a page
            date: date
        }, (err, html) => 
        {
            const username = req.session.username
            require(global.path + '/view.js')(req, res,
            {
                title: global.i18n.__('historyOf', {p: req.params.name}),
                content: html,
                username: username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                isPage: true,
                pageMode: "history",
                pagename: req.params.name,
                
            })
        })
        
    })
}