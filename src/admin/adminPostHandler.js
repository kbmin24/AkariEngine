module.exports = (req, res, users, perm, adminlog) =>
{
    const username = req.session.username
    switch (req.params.name)
    {
        case 'grant':
            require(__dirname + '/grant.js')(req, res, users, perm, adminlog)
            return
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}