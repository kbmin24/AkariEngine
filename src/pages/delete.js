module.exports = (req, res, username, users, pages, recentchanges, history, perm) =>
{
    //username parameter: reserved for history
    //todo: ACL
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    perm.findOne({where: {username: username, perm: 'grant'}}).then(p =>
    {
        if (p)
        {
            pages.findOne({where: {title: req.params.name}}).then(page =>
            {
                var doneby = req.session.username
                if (doneby === undefined) doneby = req.connection.remoteAddress
                if (page) //if page exists
                {
                    const oldLength = page.content.length
                    pages.destroy({where: {title: req.params.name}})
                    history.destroy({where: {page: req.params.name}})
                    recentchanges.create(
                    {
                        page: req.params.name,
                        doneBy: doneby,
                        bytechange: -oldLength,
                        comment: req.body.comment,
                        type: 'delete'
                    })
                    history.create(
                    {
                        page: req.params.name,
                        rev: 0,
                        bytechange: -oldLength,
                        editedby: doneby,
                        comment: req.body.comment,
                        type: 'delete'
                    })
                    res.redirect('/')
                }
                else
                {
                    //error!
                    require(global.path + '/error.js')(req, res, null, 'No such page.', '/', 'the main page')
                }
            })
        }
        else
        {
            require(global.path + '/error.js')(req, res, null, 'You do not have permission to delete page.', '/login', 'the login page')
        }
    })
}