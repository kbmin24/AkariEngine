import paths from './utils/paths.js'
import logger from './utils/logger.js'
import fs from 'node:fs'
import renderView from './view.js'

export default async (req, res, title, filename) =>
{
    await fs.readFile(paths.resolve(filename.replace(/^\//, '')), 'utf8', (err,data) =>
    {
        if (err)
        {
            logger.error('Failed to read file for sendfile', err)
            res.status(500).send('Internal server error')
        }
        else
        {
            renderView(req, res,
            {
                title: title,
                content: data,
                ipaddr: req.ipAddress,
                username: req.session.username
            })
        }
    })
}
