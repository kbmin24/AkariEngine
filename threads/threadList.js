import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import satisfyAcl from '../pages/satisfyACL.js'
import renderError from '../utils/error.js'
import { genCaptcha } from '../utils/captcha.js'
import renderView from '../view.js'

export default async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block

    const title = req.params.name

    //block
    const r = await satisfyAcl(req, res, ['everyone'], null, dbs['block'], true, true)

    //First check whether the page exists
    if (!(await dbs['pages'].findOne({where: {title: title}})))
    {
        renderError(req, res, { description: 'No such thread.', returnLink: '/', returnName: 'the main page', statusCode: 404 })
        return
    }

    let openThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: true}})
    let closedThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: false}})

    let captcha = await genCaptcha()

    ejs.renderFile(paths.view('threads/threadlist.ejs'),
    {
        pagename: title,
        captcha: captcha,
        openThreads: openThreads,
        closedThreads: closedThreads,
        r: r
    }, (err, html) => 
    {
        if (err)
        {
            logger.error('Thread list rendering failed', err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        renderView(req, res,
        {
            title: `${title}의 토론`,
            content: html,
            isPage: true,
            pageMode: "threads",
            pagename: title
            
        })
    })
}
