module.exports = (req, res, pages, history) =>
{
    var rev = req.query.rev
    if (rev === undefined)
    {
        //get the newest ver.
        pages.findOne({where: {title: req.params.name}}).then(page =>
        {
            if (page) //if page exists
            {
                //show the page
                res.render('outline',
                {
                    title: page.title,
                    content: page.content,
                    isPage: true,
                    pagename: page.title,
                    username: req.session.username,
                    wikiname: global.appname
                })
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
                //show the page
                res.render('outline',
                {
                    title: page.page + ' (r' + rev +')',
                    content: page.content,
                    isPage: true,
                    pagename: page.page,
                    username: req.session.username,
                    wikiname: global.appname
                })
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
            }
        })
    }
}