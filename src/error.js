//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname, code=200, lang='en') =>
{
    let content = ''
    if (lang == 'ko')
    {
        content = description + '<br>' + '<a href="' + returnlink + '">' + returnname + '</a>(으)로 돌아갑니다.'
    }
    else
    {
        content = description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.'
    }
    res.status(code)
    require(global.path + '/view.js')(req, res,{
        title: 'Error!',
        content: content,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress)
    })
}