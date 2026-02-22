const paths = require('../utils/paths')
const i18n = require("i18n")

module.exports = async (req, res, pages, history, protect, perm, block) =>
{
    //check read ACL
    const pro = await protect.findOne({where: {title: req.params.name, task: 'read'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    let ACLList = [acl]
    var rev = req.query.rev
    if (rev)
    {
        const proRev = await protect.findOne({where: {title: req.params.name, task: 'read', revision: rev}})
        if (proRev)
        {
            ACLList.push(proRev.protectionLevel)
        }
    }
    const r = await require(paths.resolve('pages', 'satisfyACL.js'))(req, res, ACLList, perm, block)
    if (r)
    {
        //do nothing
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        require(paths.resolve('error.js'))(req, res, { description: i18n.__('edit_nocal', {acl: acl}), returnLink: '/', returnName: '메인 페이지', statusCode: 403 })
        return
    }

    if (rev === undefined)
    {
        pages.findOne({where: {title: req.params.name}}).then(page =>
        {
            if (page) //if page exists
            {
                res.setHeader('content-type', 'text/plain')
                res.send(page.content)
            }
            else
            {
                //404!
                require(paths.resolve('error.js'))(req, res, { description: i18n.__('noPageMsg', {name: req.params.name}), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
            }
        })
    }
    else
    {
        //get the nth revision
        history.findOne(
            {
                where:
                {
                    page: req.params.name,
                    rev: rev
                }
            }
            ).then(page =>
            {
                if (page)
                {
                    res.setHeader('content-type', 'text/plain')
                    res.send(page.content)
                }
                else
                {
                    require(paths.resolve('error.js'))(req, res, { description: i18n.__('noPageMsg', {name: req.params.name}), returnLink: '/', returnName: i18n.__('mainpage'), statusCode: 404 })
                }
            })
    }
}
