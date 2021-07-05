module.exports = (req, res, username, users, pages, recentchanges) =>
{
    //username parameter: reserved for history
    //todo: ACL
    pages.findOne({where: {title: req.params.name}}).then(page =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = 'IP User'
        if (page) //if page exists
        {
            page.update({content: req.body.content, currentRev: page.currentRev + 1})
            .then(() =>
            {
                recentchanges.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    doneBy: doneby,
                    type: 'edit'
                })
                res.redirect('/w/' + req.params.name)
            })
        }
        else
        {
            //add one
            pages.create(
            {
                title: req.params.name,
                content: req.body.content,
                currentRev: 1
            })
            .then(() =>
            {
                recentchanges.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    doneBy: doneby,
                    type: 'create'
                })
                res.redirect('/w/' + req.params.name)
            })
        }
    })
}