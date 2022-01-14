let fs = require('fs')
module.exports = async (req, res, username, users, pages, recentchanges, history, perm, files) =>
{
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    if (req.params.name === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'The page name is not specified.', '/', 'the main page.')
        return
    }
    let isaFile = req.params.name.toLowerCase().startsWith('file:')
    let filename = ''
    if (isaFile)
    {
        if (!(perm.findOne({where: {username: username, perm: 'deletefile'}})))
        {
            require(global.path + '/error.js')(req, res, null, 'You do not have permission to delete file.', '/login', 'the login page')
            return
        }
        filename = /File:(.*)/.exec(req.params.name)[1]
        if (!(filename.length > 0))
        {
            require(global.path + '/error.js')(req, res, null, 'An unknown error occurred whilst trying to delete the file.', '/', 'the main page.')
            return
        }
        files.destroy({where: {filename: filename}})
        fs.unlinkSync(global.path + '/public/uploads/' + filename)
    }
    perm.findOne({where: {username: username, perm: 'deletepage'}}).then(p =>
    {
        if (p)
        {
            pages.findOne({where: {title: req.params.name}}).then(page =>
            {
                var doneby = req.session.username
                if (doneby === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress
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