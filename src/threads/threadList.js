import ejs from 'ejs'
import paths from '../utils/paths.js'
import logger from '../utils/logger.js'
import renderError from '../utils/error.js'
import { genCaptcha } from '../utils/captcha.js'
import renderView from '../view.js'
import i18n from 'i18n'

export default async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block

    const title = req.params.name

    //First check whether the page exists
    if (!(await dbs['pages'].findOne({where: {title: title}})))
    {
        renderError(req, res, {
            description: i18n.__('page404'),
            returnLink: '/',
            returnName: i18n.__('mainpage'),
            statusCode: 404 })
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
        r: req.aclResult.allowed,
        i18nKey: req.aclResult.error.i18nKey,
        i18nParams: req.aclResult.error.i18nParams,
        t: i18n.__
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
            title: i18n.__('threadOf', {page: title}),
            content: html,
            isPage: true,
            pageMode: "threads",
            pagename: title
            
        })
    })
}
