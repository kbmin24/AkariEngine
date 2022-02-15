const ejs = require('ejs')
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
    ejs.renderFile(global.path + '/views/pages/pagelist.ejs',{pages: pagelist.rows, count: pagelist.count, currentPage: page}, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.status(500).send('Internal Server Error<br>')
            return
        }
        const username = req.session.username
        require(global.path + '/view.js')(req, res,
        {
            title: '문서 목록',
            content: html,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    })
}