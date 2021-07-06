module.exports = (req, res, username, users, pages, recentchanges, history) =>
{
    //username parameter: reserved for history
    //todo: ACL
    pages.findOne({where: {title: req.params.name}}).then(page =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.connection.remoteAddress
        if (page) //if page exists
        {
            const oldLength = page.content.length
            page.update({content: req.body.content, currentRev: page.currentRev + 1})
            .then(() =>
            {
                recentchanges.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    doneBy: doneby,
                    bytechange: req.body.content.length - oldLength,
                    comment: req.body.comment,
                    type: 'edit'
                })
                history.create(
                {
                    page: req.params.name,
                    rev: page.currentRev,
                    content: req.body.content,
                    bytechange: req.body.content.length - oldLength,
                    editedby: doneby,
                    comment: req.body.comment,
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
                    rev: 1,
                    doneBy: doneby,
                    comment: req.body.comment,
                    bytechange: req.body.content.length,
                    type: 'create'
                })
                history.create(
                {
                    page: req.params.name,
                    rev: 1,
                    content: req.body.content,
                    bytechange: req.body.content.length,
                    editedby: doneby,
                    comment: req.body.comment,
                    type: 'create'
                })
                res.redirect('/w/' + req.params.name)
            })
        }
    })
}