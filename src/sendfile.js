const paths = require('./utils/paths')
const logger = require('./utils/logger')

module.exports = async (req, res, title, filename) =>
{
    const fs = require('fs')
    await fs.readFile(paths.resolve(filename.replace(/^\//, '')), 'utf8', (err,data) =>
    {
        if (err)
        {
            logger.error('Failed to read file for sendfile', err)
            res.status(500).send('Internal server error')
        }
        else
        {
            require(paths.resolve('view.js'))(req, res,
            {
                title: title,
                content: data,
                ipaddr: req.ipAddress,
                username: req.session.username
            })
        }
    })
}
