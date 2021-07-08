//http://localhost:8080/revert/FrontPage?rev=29
module.exports = (req, res, username, users, pages, recentchanges, history) =>
{
    //username parameter: reserved for history
    //todo: ACL
    pages.findOne({where: {title: decodeURI(decodeURI(req.params.name))}}).then(page =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.connection.remoteAddress
        if (page) //if page exists
        {
            const oldLength = page.content.length
            var oldcontent = undefined
            history.findOne({where: {page: decodeURI(req.params.name), rev: req.query.rev}}).then(oldrev =>
            {
                if (oldrev === undefined)
                {
                    require(global.path + '/error.js')(req, res, null, 'No such revision.', '/', 'the main page')
                }
                else
                {
                    oldcontent = oldrev.content
                    page.update({content: oldcontent, currentRev: page.currentRev + 1})
                    .then(() =>
                    {
                        recentchanges.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            doneBy: doneby,
                            bytechange: page.content.length - oldLength,
                            comment: 'Reverted to r' + req.query.rev,
                            type: 'revert'
                        })
                        history.create(
                        {
                            page: decodeURI(req.params.name),
                            rev: page.currentRev,
                            content: page.content,
                            bytechange: page.content.length - oldLength,
                            editedby: doneby,
                            comment: 'Reverted to r' + req.query.rev,
                            revertTo: req.query.rev,
                            type: 'revert'
                        })
                        res.redirect('/w/' + decodeURI(req.params.name))
                    })
                }
            })
        }
        else
        {
            //error!
            console.log(decodeURI(req.params.name))
            require(global.path + '/error.js')(req, res, null, 'No such page.', '/', 'the main page')
        }
    })
}