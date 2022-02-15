module.exports = async (req, res, title, filename) =>
{
    const fs = require('fs')
    await fs.readFile(__dirname + filename, (err,data) =>
    {
        if (err)
        {
            console.error(err)
            res.status(500).send('Internal server error')
        }
        else
        {
            require(global.path + '/view.js')(req, res,
            {
                title: title,
                content: data,
                wikiname: global.appname,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                username: req.session.username
            })
        }
    })
}