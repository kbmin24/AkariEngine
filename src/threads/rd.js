const { Op } = require('sequelize')
const date = require('date-and-time')
const ejs = require('ejs')
module.exports = async (req, res, recentdiscuss, thread) =>
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

    //const show = (req.query.show ? req.query.show: 30) * 1
    const isOpen = (req.query.isopen ? req.query.isopen != 'false' : true)
    let ch = await recentdiscuss.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ],
        //.limit: show
    })
    let filteredCh = []
    for (let m of ch)
    {
        let th = await thread.findOne({where: {threadID: m.threadID}})
        if (th.isOpen == isOpen)
        {
            filteredCh.push(m)
        }   
    }

    ejs.renderFile(global.path + '/views/threads/RecentDiscuss.ejs',
    {
        changes: filteredCh,
        date: date
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: '최근 토론',
            content: html,
            isPage: false,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}