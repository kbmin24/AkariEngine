module.exports = (req, res, pages, history) =>
{
    var rev = req.query.rev
    if (rev === undefined)
    {
        pages.findOne({where: {title: req.params.name}}).then(page =>
        {
            if (page) //if page exists
            {
                res.send(page.content)
            }
            else
            {
                //404!
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
            }
        })
    }
    else
    {
        //get the nth revision
        history.findOne(
            {
                where:
                {
                    page: req.params.name,
                    rev: rev
                }
            }
            ).then(page =>
            {
                if (page)
                {
                    res.send(page.content)
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
                }
            })
    }
}