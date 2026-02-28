import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderError from '../utils/error.js'
import renderView from '../view.js'

export default async (req, res, options) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
        return
    }
    if (!(await options.perm.findOne({where: {username: req.session.username, perm: 'developer'}})))
    {
        renderError(req, res, { description: 'No such user.', returnLink: '/', returnName: 'FrontPage' })
        return
    }
    ejs.renderFile(paths.view('admin/developermenu.ejs'),
    (err, html) => 
    {
        if (err)
        {
            logger.error('Developer menu rendering failed', err)
            res.status(500).send('Internal Server Error')
            return
        }
        renderView(req, res,
        {
            title: 'Developer console',
            content: html,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
}
