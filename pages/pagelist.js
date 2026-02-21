const ejs = require('ejs')
const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const pageLength = 50
module.exports = async (req, res, pages) =>
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
        require(paths.resolve('view.js'))(req, res,
        {
            title: '문서 목록',
            content: html,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
}
