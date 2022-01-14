const ejs = require('ejs')
const date = require('date-and-time')
const {Op} = require('sequelize')
module.exports = async (req, res, options) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    if (!(await options.perm.findOne({where: {username: req.session.username, perm: 'developer'}})))
    {
        require(global.path + '/error.js')(req, res, null, 'No such user.', '/', 'FrontPage')
        return
    }
    ejs.renderFile(global.path + '/views/admin/developermenu.ejs',
    (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.status(500).send('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: 'Developer console',
            content: html,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}