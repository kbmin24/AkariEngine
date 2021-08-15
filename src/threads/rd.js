const { Op } = require('sequelize')
const date = require('date-and-time')
const ejs = require('ejs')
module.exports = async (req, res, recentdiscuss) =>
{

    //remove 'old' ones
    await recentdiscuss.findAll({
        limit:1,
        order: [['id', 'DESC']]
    })
    .then(entries =>
    {
        const latestChange = entries[0].id
        recentdiscuss.destroy(
        {
            where:
            {
                id: {[Op.lt]: latestChange - 100}
            }
        })
    })

    const show = (req.query.show ? req.query.show: 30) * 1
    let ch = await recentdiscuss.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ],
        limit: show
    })
    ejs.renderFile(global.path + '/views/threads/RecentDiscuss.ejs',
    {
        changes: ch,
        date: date
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: 'RecentDiscuss',
            content: html,
            isPage: false,
            username: req.session.username,
            wikiname: global.appname
        })
    })
}