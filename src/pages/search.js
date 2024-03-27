const {Op} = require('sequelize')
const arraywrap = require('arraywrap')
const sanitiseHtml = require('sanitize-html')
const ejs = require('ejs')
module.exports = async (req, res, pages) =>
{
    //just search
    const query = arraywrap(req.query.q)[0].trim()
    if (query == '')
    {
        res.status(400).send('Empty search')
        return
    }
    let from = 0
    if (req.query.from)
    {
        if (isNaN(req.query.from))
        {
            res.status(400).send('The query must be a number.')
            return
        }
        from = req.query.from * 1
    }
    const searchres = await pages.findAll(
        {
            where: {
                title: {[Op.like]: `%${query}%`},
            },
            order:
            [
                ['updatedAt', 'DESC']
            ],
            limit: 10,
            offset: from
        }
    )
    const searchres2 = await pages.findAll(
        { 
            where: {
                content: {[Op.like]: `%${query}%`},
            },
            order:
            [
                ['updatedAt', 'DESC']
            ],
            limit: 10,
            offset: from
        }
    )
    const searchHTML = await ejs.renderFile(global.path + '/views/pages/search.ejs',
    {
        searchtitle: query,
        resultTitle: searchres,
        resultContent: searchres2,
        from: from
    })
    const username = req.session.username
    require(global.path + '/view.js')(req, res,
    {
        title: global.i18n.__('searchResults', {q: sanitiseHtml(query, {disallowedTagsMode: escape})}),
        content: searchHTML,
        username: username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.conf.appname
    })
    return
}