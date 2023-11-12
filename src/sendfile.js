module.exports = async (req, res, title, filename) =>
{
    const fs = require('fs')
    await fs.readFile(global.path + filename, 'utf8', (err,data) =>
    {
        if (err)
        {
            console.error(err)
            res.status(500).send('Internal server error')
        }
        else
        {
            console.log(data)
            require(global.path + '/view.js')(req, res,
            {
                title: title,
                content: data,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                username: req.session.username
            })
        }
    })
}