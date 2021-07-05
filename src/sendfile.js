module.exports = (req, res, title, filename) =>
{
    const fs = require('fs')
    fs.readFile(__dirname + filename, (err,data) =>
    {
        if (err)
        {
            console.error(err)
            res.status(500).send('Internal server error')
        }
        else
        {
            res.render('outline',
            {
                title: title,
                content: data,
                wikiname: global.appname,
                username: req.session.username
            })
        }
    })
}