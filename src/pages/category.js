const ejs = require('ejs')
module.exports = async (req, res, category) =>
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
    ejs.renderFile(global.path + '/views/pages/category.ejs',
    {category: searchRes}, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: '분류 ' + req.params.name,
            content: html,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
}