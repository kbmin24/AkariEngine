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
        res.status(400).send('Search keyword cannot be null.')
        return
    }
    const searchres = await pages.findAll(
        {
            where: {
                title: {[Op.like]: `%${query}%`},
            }
        }
    )
    const searchres2 = await pages.findAll(
        {
            where: {
                content: {[Op.like]: `%${query}%`},
            }
        }
    )
    const searchHTML = await ejs.renderFile(global.path + '/views/pages/search.ejs',
    {
        searchtitle: query,
        resultTitle: searchres,
        resultContent: searchres2
    })
    const username = req.session.username
    res.render('outline',
    {
        title: 'Search results for ' + sanitiseHtml(query, {disallowedTagsMode: escape}),
        content: searchHTML,
        username: username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })
    return
}