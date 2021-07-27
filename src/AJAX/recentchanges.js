//const ejs = require('ejs')
//const updRecentChanges = require('./updRecentChanges')
module.exports = (req, res, recentchanges) =>
{
    const show = (req.query.show ? req.query.show: 30) * 1
    recentchanges.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ],
        limit: show
    }).then( changes =>
    {
        /*
        var show = req.query.show
        if(show === undefined)
        {
            show = 999999 //we can treat this as INF
        }
        show = (show > changes.count ? changes.count : show)*/
        res.json(changes)
    })
}