import { Op } from 'sequelize'
import date from 'date-and-time'
import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderView from '../view.js'

export default async (req, res, recentdiscuss, thread) =>
{

    //remove 'old' ones
    await recentdiscuss.findAll({
        limit:1,
        order: [['id', 'DESC']]
    })
    .then(entries =>
    {
        if (entries.length == 0) return
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

    ejs.renderFile(paths.view('threads/RecentDiscuss.ejs'),
    {
        changes: filteredCh,
        date: date
    }, (err, html) => 
    {
        if (err)
        {
            logger.error('Recent discuss rendering failed', err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        renderView(req, res,
        {
            title: '최근 토론',
            content: html,
            isPage: false,
            username: req.session.username,
            ipaddr: req.ipAddress,
            
        })
    })
}
