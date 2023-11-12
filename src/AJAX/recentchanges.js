//const ejs = require('ejs')
const sanitiseHtml = require('sanitize-html')
function sanitize(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return string.replace(reg, (match)=>(map[match]));
  }
module.exports = async (req, res, recentchanges) =>
{
    await require(global.path + '/pages/updRecentChanges.js')(recentchanges)
    let show = Math.min((req.query.show ? req.query.show: 30) * 1, 100)
    const changes = await recentchanges.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ]
    })

    let isUnique = req.query.isunique === 'true'
    let excludefile = req.query.excludefile === 'true'
    let editOnly = req.query.editonly === 'true'

    let uniqueNames = new Set()
    let results = []
    changes.forEach((value, index, array) =>
    {
        if (show <= 0) return
        if (excludefile && value.page.toLowerCase().startsWith('file:')) return
        if (value.page.toLowerCase().startsWith('user:')) return
        if (editOnly && (value.type !== 'edit' && value.type !== 'create')) return
        if (!isUnique || !uniqueNames.has(value.page))
        {
            array[index].page = sanitize(sanitiseHtml(value.page, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}))
            array[index].doneBy = sanitize(sanitiseHtml(value.doneBy, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}))
            array[index].comment = sanitize(sanitiseHtml(value.comment, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape}))
            results.push(array[index])
            if (isUnique) uniqueNames.add(value.page)
            show--
        }
    })
    res.json(results)
}