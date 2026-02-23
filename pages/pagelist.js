import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderView from '../view.js'
const pageLength = 50

export default async (req, res, pages) =>
{
    let page = req.query.page * 1 || 1
    let pagelist = await pages.findAndCountAll(
    {
        order:
        [
            ['title', 'ASC']
        ],
        offset: (page - 1) * pageLength,
        limit: pageLength
    })
    ejs.renderFile(paths.view('pages/pagelist.ejs'),{pages: pagelist.rows, count: pagelist.count, currentPage: page}, (err, html) => 
    {
        if (err)
        {
            logger.error('Page list rendering failed', err)
            res.status(500).send('Internal Server Error<br>')
            return
        }
        const username = req.session.username
        renderView(req, res,
        {
            title: '문서 목록',
            content: html,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
}
