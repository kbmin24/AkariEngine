//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname, code=200, lang='en') =>
{
    username = req.session.username
    res.status(code)
    if (lang=='ko')
    {
        require(global.path + '/view.js')(req, res,{
            title: '정보',
            content: description + '<br>' + '<a href="' + returnlink + '">' + returnname + '</a>으로 돌아갑니다.',
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    }
    else
    {
        require(global.path + '/view.js')(req, res,{
            title: 'Information',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            wikiname: global.appname
        })
    }
}