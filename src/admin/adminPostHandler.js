module.exports = (req, res, users, perm) =>
{
    const username = req.session.username
    switch (req.params.name)
    {
        case 'grant':
            require(__dirname + '/grant.js')(req, res, users,perm)
            return
        default:
            res.writeHead(404)
            res.write('404 Not Found')
            return
    }
}