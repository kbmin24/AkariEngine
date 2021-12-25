const {Op} = require('sequelize')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, dbs = {}) =>
{
    //TODO: check permission
    var query = req.query.q
    if (!query)
    {
        res.json({})
        return
    }
    query = query.trim()
    const searchres = await dbs['threadcomment'].findAll(
        {
            where: {
                'threadID': query
            },
            order:
            [
                ['createdAt', 'ASC']
            ],
        }
    )
    
    var resArr = []
    for (let v of searchres)
    {
        let content = v.content
        if (v.isHidden)
        {
            //TODO: check if admin
            content = ''
        }
        resArr.push(
        {
            type: v.type,
            username: sanitiseHtml(v.doneBy, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}),
            content: await require(global.path + '/pages/render.js')('', content, true, dbs['pages'], dbs['file'], null, null, false, false, {}, {}),
            date: v.createdAt,
            isHidden: v.isHidden
        })
    }
    res.json(resArr)
    return
}