const ejs = require('ejs')
const date = require('date-and-time')
module.exports = (req, res, files) =>
{
    files.findOne({where: {filename: req.params.name}}).then(file =>
    {
        if (file)
        {
            ejs.renderFile(global.path + '/views/files/viewfile.ejs',
            {
                filename: req.params.name,
                creator: file.uploader,
                uploadTime: file.createdAt,
                date: date,
                explanation: require(global.path + '/pages/render.js')(file.explanation, true)
            }, (err, html) => 
            {
                res.render('outline',
                {
                    title: req.params.name,
                    content: html,
                    isFile: true,
                    username: req.session.username,
                    wikiname: global.appname
                })
            })
        }
        else
        {
            //404!
            require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
        }
    })
}