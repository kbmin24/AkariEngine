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
        res.status(400).send('검색어가 비어 있습니다.')
        return
    }
    let from = 0
    if (req.query.from)
    {
        if (isNaN(req.query.from))
        {
            res.status(400).send('쿼리는 숫자여야 합니다.')
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
        title: sanitiseHtml(query, {disallowedTagsMode: escape}) + '의 검색 결과',
        content: searchHTML,
        username: username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.conf.appname
    })
    return
}