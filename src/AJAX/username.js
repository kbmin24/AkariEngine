const {Op} = require('sequelize')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, users) =>
{
    //just search
    var query = req.query.q
    if (!query)
    {
        res.json({})
        return
    }
    query = query.trim()
    const searchres = await users.findAll(
        {
            attributes: ['username'],
            where: {
                username: {[Op.like]: `${query}%`}
            },
            order:
            [
                ['username', 'ASC']
            ],
            limit: 10
        }
    )
    const resJSON = sanitiseHtml(JSON.stringify(searchres), {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
    res.send(resJSON)
    return
}