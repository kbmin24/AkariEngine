const {Op} = require('sequelize')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, pages) =>
{
    //just search
    var query = req.query.q
    if (!query)
    {
        res.json({})
        return
    }
    query = query.trim()
    const searchres = await pages.findAll(
        {
            attributes: ['title'],
            where: {
                title: {[Op.like]: `${query}%`}
            },
            order:
            [
                ['title', 'ASC']
            ],
            limit: 10
        }
    )
    const resJSON = sanitiseHtml(JSON.stringify(searchres), {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
    res.send(resJSON)
    return
}