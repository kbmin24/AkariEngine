const ejs = require('ejs')
module.exports = (req, res, files) =>
{
    files.findAndCountAll(
    {
        order:
        [
            ['filename', 'ASC']
        ]
    }).then( filelist =>
    {
        ejs.renderFile(global.path + '/views/files/filelist.ejs',{files: filelist.rows, count: filelist.count}, (err, html) => 
        {
            const username = req.session.username
            res.render('outline',
            {
                title: 'FileList',
                content: html,
                username: username,
                wikiname: global.appname
            })
        })
    })
}