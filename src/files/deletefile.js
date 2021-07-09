const fs = require('fs')
module.exports = (req, res, files, history, recentchanges) =>
{
    //username parameter: reserved for history
    //todo: ACL
    files.findOne({where: {filename: req.params.name}}).then(file =>
    {
        var doneby = req.session.username
        if (doneby === undefined) doneby = req.connection.remoteAddress
        if (file) //if page exists
        {
            const oldLength = file.explanation.length
            files.destroy({where: {filename: req.params.name}})
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
                bytechange: -oldLength,
                editedby: doneby,
                comment: req.body.comment,
                rev: 0,
                type: 'delete'
            })
            fs.unlinkSync(global.path + '/public/uploads/' + req.params.name)
            res.redirect('/')
        }
        else
        {
            //error!
            require(global.path + '/error.js')(req, res, null, 'No such file.', '/', 'the main page')
        }
    })
}