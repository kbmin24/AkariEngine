import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderView from '../view.js'

export default async (req, res, category) =>
{
    const searchRes = await category.findAndCountAll({
        where:
        {
            category: req.params.name
        },
        order:
        [
            ['page', 'ASC']
        ]
    })
    ejs.renderFile(paths.view('pages/category.ejs'),
    {category: searchRes}, (err, html) => 
    {
        if (err)
        {
            logger.error('Category rendering failed', err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        renderView(req, res,
        {
            title: '분류 ' + req.params.name,
            content: html,
            username: req.session.username,
            ipaddr: req.ipAddress,
            
        })
    })
}
