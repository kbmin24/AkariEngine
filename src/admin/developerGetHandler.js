const ejs = require('ejs')
const date = require('date-and-time')
const {Op} = require('sequelize')
const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
module.exports = async (req, res, options) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(paths.resolve('error.js'))(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
        return
    }
    if (!(await options.perm.findOne({where: {username: req.session.username, perm: 'developer'}})))
    {
        require(paths.resolve('error.js'))(req, res, null, 'No such user.', '/', 'FrontPage')
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
        require(paths.resolve('view.js'))(req, res,
        {
            title: 'Developer console',
            content: html,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
}
