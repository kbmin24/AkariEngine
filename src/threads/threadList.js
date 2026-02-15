const ejs = require('ejs')
const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
module.exports = async (req, res, dbs = {}) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block

    const title = req.params.name

    //block
    const r = await require(paths.resolve('pages', 'satisfyACL.js'))(req, res, ['everyone'], null, dbs['block'], true, true)

    //First check whether the page exists
    if (!(await dbs['pages'].findOne({where: {title: title}})))
    {
        require(paths.resolve('error.js'))(req, res, null, 'No such thread.', '/', 'the main page', code=404)
        return
    }

    let openThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: true}})
    let closedThreads = await dbs['thread'].findAll({where: {pagename: title, isOpen: false}})

    let captcha = await require(paths.resolve('tools', 'captcha.js')).genCaptcha(req)

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
        require(paths.resolve('view.js'))(req, res,
        {
            title: `${title}의 토론`,
            content: html,
            isPage: true,
            pageMode: "threads",
            pagename: title
            
        })
    })
}
