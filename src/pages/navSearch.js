//navSearch.js
module.exports = async (req, res, pages) =>
{
    req.body.pagename = req.body.pagename.trim()
    if (req.body.pagename == '')
    {
        res.status(400).send('검색어가 비어 있습니다.')
        return
    }
    const p = await pages.findOne({where: {title: req.body.pagename}})
    if (p)
    {
        res.redirect('/w/' + req.body.pagename)
        return
    }
    else
    {
        res.redirect('/search?q=' + req.body.pagename)
        return
    }
}