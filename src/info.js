//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname, code=200) =>
{
    username = req.session.username
    res.status(code)
    res.render('outline',{
        title: 'Information',
        content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
        username: username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        wikiname: global.appname
    })
}