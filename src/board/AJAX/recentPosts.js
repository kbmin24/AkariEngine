//const ejs = require('ejs')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, boardposts) =>
{
    let show = Math.min((req.query.show ? req.query.show: 30) * 1, 100)
    const changes = await boardposts.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ]
    })
    let results = []

    changes.forEach((value, index, array) =>
    {
        if (show <= 0) return
        results.push({
            boardID: value.boardID,
            title: sanitiseHtml(value.title, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}),
            idAtBoard: value.idAtBoard,
            createdAt: value.createdAt
        })
        show--
    })
    res.json(results)
}