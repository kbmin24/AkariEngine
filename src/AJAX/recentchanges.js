//const ejs = require('ejs')
const sanitiseHtml = require('sanitize-html')
module.exports = async (req, res, recentchanges) =>
{
    await require(global.path + '/pages/updRecentChanges.js')(recentchanges)
    const show = (req.query.show ? req.query.show: 30) * 1
    recentchanges.findAll(
    {
        order:
        [
            ['id', 'DESC']
        ],
        limit: show
    }).then( changes =>
    {
        /*
        var show = req.query.show
        if(show === undefined)
        {
            show = 999999 //we can treat this as INF
        }
        show = (show > changes.count ? changes.count : show)*/
        
        //XSS Protection
        changes.forEach((value, index, array) =>
        {
            array[index].page = sanitiseHtml(value.page, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
            array[index].doneBy = sanitiseHtml(value.doneBy, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
            array[index].comment = sanitiseHtml(value.comment, {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: escape})
        })
        res.json(changes)
    })
}