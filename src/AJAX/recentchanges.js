//const ejs = require('ejs')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, recentchanges) =>
{
    await require(global.path + '/pages/updRecentChanges.js')(recentchanges)
    let show = (req.query.show ? req.query.show: 30) * 1
    const changes = await recentchanges.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ]
    })

    let isUnique = req.query.isunique === 'true'

    let uniqueNames = new Set()
    let results = []
    changes.forEach((value, index, array) =>
    {
        if (show <= 0) return
        if (!isUnique || !uniqueNames.has(value.page))
        {
            array[index].page = sanitiseHtml(value.page, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
            array[index].doneBy = sanitiseHtml(value.doneBy, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
            array[index].comment = sanitiseHtml(value.comment, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
            results.push(array[index])
            if (isUnique) uniqueNames.add(value.page)
            show--
        }
    })
    res.json(results)
}